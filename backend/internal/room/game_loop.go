package room

import (
	"math/rand"
	"time"

	"zha-jinhua/internal/game"
	"zha-jinhua/internal/model"
	"zha-jinhua/internal/ws"
)

// toWSCards converts a [3]game.Card slice to []ws.Card for broadcasting.
func toWSCards(cards [3]game.Card) []ws.Card {
	return []ws.Card{
		{Suit: cards[0].Suit, Rank: cards[0].Rank},
		{Suit: cards[1].Suit, Rank: cards[1].Rank},
		{Suit: cards[2].Suit, Rank: cards[2].Rank},
	}
}

// StartGame deals cards, deducts antes, and begins the betting phase.
func (r *Room) StartGame() {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Build active player list from all current players
	activeIDs := make([]int, 0, len(r.Players))
	for _, p := range r.Players {
		activeIDs = append(activeIDs, p.UserID)
	}

	// Deduct ante from all players
	anteTotal := 0
	for _, p := range r.Players {
		p.Chips -= r.Settings.Ante
		if p.Chips < 0 {
			p.Chips = 0
		}
		anteTotal += r.Settings.Ante
	}

	// Create and shuffle deck, deal cards
	deck := game.NewDeck()
	hands := game.DealCards(deck, len(activeIDs))

	// Build hands map and seen map
	handMap := make(map[int][3]game.Card, len(activeIDs))
	seenMap := make(map[int]bool, len(activeIDs))
	for i, uid := range activeIDs {
		handMap[uid] = [3]game.Card(hands[i])
		seenMap[uid] = false
	}

	// Random starting player
	startIdx := rand.Intn(len(activeIDs))

	// Initialize game session
	r.Game = &GameSession{
		Hands:         handMap,
		Seen:          seenMap,
		Pot:           anteTotal,
		CurrentBet:    r.Settings.Ante,
		TurnIndex:     startIdx,
		TurnStart:     time.Now(),
		Phase:         PhaseBetting,
		ActivePlayers: activeIDs,
		Eliminated:    make([]int, 0),
		RoundCount:    1,
		LastRaiser:    -1,
	}
	r.Status = StatusPlaying

	// Broadcast game start
	r.Broadcast(ws.S2CGameStart{Type: ws.S2CTypeGameStart, CurrentTurn: activeIDs[startIdx], TurnTimeout: 30, Pot: anteTotal})

	// Send each player their cards privately
	for _, uid := range activeIDs {
		r.SendTo(uid, ws.S2CYourCards{Type: ws.S2CTypeYourCards, Cards: toWSCards(handMap[uid])})
	}

	// Announce first turn
	r.broadcastTurnChange()

	// Start timeout timer
	r.startTimer()

	// If first player is a bot, trigger its action
	nextPlayer := r.playerByID(activeIDs[startIdx])
	if nextPlayer != nil && nextPlayer.IsBot {
		r.triggerBotAction(activeIDs[startIdx])
	}
}

// HandleReady marks a player ready and starts the game if conditions are met.
func (r *Room) HandleReady(userID int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, p := range r.Players {
		if p.UserID == userID {
			p.Ready = true
			break
		}
	}

	r.maybeFillBots()

	// Check if all players are ready and we have enough players
	if len(r.Players) < r.Settings.MinPlayers {
		// Still broadcast updated state so the player sees their ready status
		r.Broadcast(ws.S2CRoomState{Type: ws.S2CTypeRoomState, RoomID: r.ID, Name: r.Name, Status: string(r.Status), Settings: roomSettingsToMsg(r.Settings), Players: r.playerInfoListLocked()})
		return
	}
	for _, p := range r.Players {
		if !p.Ready {
			r.Broadcast(ws.S2CRoomState{Type: ws.S2CTypeRoomState, RoomID: r.ID, Name: r.Name, Status: string(r.Status), Settings: roomSettingsToMsg(r.Settings), Players: r.playerInfoListLocked()})
			return
		}
	}

	// All ready — broadcast then start after brief delay
	r.Broadcast(ws.S2CRoomState{Type: ws.S2CTypeRoomState, RoomID: r.ID, Name: r.Name, Status: string(r.Status), Settings: roomSettingsToMsg(r.Settings), Players: r.playerInfoListLocked()})

	go func() {
		time.Sleep(200 * time.Millisecond)
		r.StartGame()
	}()
}

// roomSettingsToMsg converts RoomSettings to the wire-format settings message.
func roomSettingsToMsg(s RoomSettings) ws.RoomSettingsMsg {
	return ws.RoomSettingsMsg{
		MaxPlayers: s.MaxPlayers,
		MinPlayers: s.MinPlayers,
		Ante:       s.Ante,
		AllowBot:   s.AllowBot,
	}
}

// HandleBet processes a betting action from a player.
// action: "call" | "raise" | "fold" | "blind_bet"
// amount: optional raise amount (ignored for non-raise actions)
func (r *Room) HandleBet(userID int, action string, amount int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.Game == nil || r.Game.Phase != PhaseBetting {
		return
	}

	// Validate it's this player's turn
	activeIdx := r.Game.TurnIndex
	if activeIdx >= len(r.Game.ActivePlayers) {
		return
	}
	currentID := r.Game.ActivePlayers[activeIdx]
	if currentID != userID {
		return
	}

	player := r.playerByID(userID)
	if player == nil {
		return
	}

	// Refresh TurnStart to invalidate old timer
	r.Game.TurnStart = time.Now()


	baseMsg := ws.S2CPlayerAction{
		Type:       ws.S2CTypePlayerAction,
		PlayerID:   userID,
		Pot:        r.Game.Pot,
		CurrentBet: r.Game.CurrentBet,
	}
	switch action {
	case "fold":
		r.handleFold(userID)
		return

	case "raise":
		raiseAmt := r.Game.CurrentBet
		if amount > r.Game.CurrentBet {
			raiseAmt = amount
		}
		if raiseAmt > player.Chips {
			raiseAmt = player.Chips
		}
		if raiseAmt <= r.Game.CurrentBet {
			return // must raise more than current bet
		}
		if raiseAmt <= 0 {
			return
		}
		player.Chips -= raiseAmt
		r.Game.Pot += raiseAmt
		r.Game.CurrentBet = raiseAmt
		r.Game.LastRaiser = userID
		r.Game.ActionsSinceLastRaise = 0

		baseMsg.Action = "raise"
		baseMsg.Amount = &raiseAmt
		r.Broadcast(baseMsg)

	case "call":
		callAmt := r.Game.CurrentBet
		if !r.Game.Seen[userID] {
			// Blind player pays half (rounded down)
			callAmt = r.Game.CurrentBet / 2
			if callAmt < 1 {
				callAmt = 1
			}
		}
		if callAmt > player.Chips {
			callAmt = player.Chips
		}
		if callAmt <= 0 {
			// Player has no chips — they check (defense)
			baseMsg.Action = "check"
			baseMsg.Amount = nil
			r.Broadcast(baseMsg)
		} else {
			player.Chips -= callAmt
			r.Game.Pot += callAmt

			baseMsg.Action = "call"
			baseMsg.Amount = &callAmt
			r.Broadcast(baseMsg)
		}
		r.Game.ActionsSinceLastRaise++

	case "blind_bet":
		if r.Game.Seen[userID] {
			// Already seen — treat as normal call
			callAmt := r.Game.CurrentBet
			if callAmt > player.Chips {
				callAmt = player.Chips
			}
			if callAmt <= 0 {
				baseMsg.Action = "check"
				baseMsg.Amount = nil
				r.Broadcast(baseMsg)
			} else {
				player.Chips -= callAmt
				r.Game.Pot += callAmt
				baseMsg.Action = "call"
				baseMsg.Amount = &callAmt
				r.Broadcast(baseMsg)
			}
		} else {
			// Blind player bets half — broadcast as "call" to hide info
			betAmt := r.Game.CurrentBet / 2
			if betAmt < 1 {
				betAmt = 1
			}
			if betAmt > player.Chips {
				betAmt = player.Chips
			}
			if betAmt <= 0 {
				baseMsg.Action = "check"
				baseMsg.Amount = nil
				r.Broadcast(baseMsg)
			} else {
				player.Chips -= betAmt
				r.Game.Pot += betAmt
				// Broadcast as "call" to not reveal blind bet info
				baseMsg.Action = "call"
				baseMsg.Amount = &betAmt
				r.Broadcast(baseMsg)
			}
		}
		r.Game.ActionsSinceLastRaise++

	default:
		return
	}

	// Auto-showdown when all active players have called since last raise
	if r.Game.LastRaiser != -1 && r.Game.ActionsSinceLastRaise >= len(r.Game.ActivePlayers)-1 {
		r.autoShowdown()
		return
	}

	// Check end conditions after action
	if len(r.Game.ActivePlayers) <= 1 {
		r.settleRound()
		return
	}

	r.advanceTurn()

	// If next player is a bot, trigger their action
	if r.Game.TurnIndex < len(r.Game.ActivePlayers) {
		nextID := r.Game.ActivePlayers[r.Game.TurnIndex]
		nextPlayer := r.playerByID(nextID)
		if nextPlayer != nil && nextPlayer.IsBot {
			r.triggerBotAction(nextID)
		}
	}
}

// HandleCompare processes a comparison between two players.
func (r *Room) HandleCompare(challengerID, targetID int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.Game == nil || r.Game.Phase != PhaseBetting {
		return
	}
	if len(r.Game.ActivePlayers) < 2 {
		return
	}

	// Both must be active
	if r.FindActivePlayerIndex(challengerID) < 0 || r.FindActivePlayerIndex(targetID) < 0 {
		return
	}

	if challengerID == targetID {
		return
	}

	// Challenger pays compare fee (current bet)
	challenger := r.playerByID(challengerID)
	if challenger == nil {
		return
	}
	fee := r.Game.CurrentBet
	if fee > challenger.Chips {
		fee = challenger.Chips
	}
	if fee > 0 {
		challenger.Chips -= fee
		r.Game.Pot += fee
	}

	// Compare hands
	challengerHand := r.Game.Hands[challengerID]
	targetHand := r.Game.Hands[targetID]
	winner := game.CompareHands(challengerHand, targetHand) // 0=challenger, 1=target

	var loserID, winnerID int
	if winner == 0 {
		winnerID = challengerID
		loserID = targetID
	} else {
		winnerID = targetID
		loserID = challengerID
	}

	loserResult := game.EvaluateHand(r.Game.Hands[loserID])

	r.Broadcast(ws.S2CCompareResult{Type: ws.S2CTypeCompareResult, ChallengerID: challengerID, TargetID: targetID, WinnerID: winnerID, LoserHandType: loserResult.HandType, LoserCards: toWSCards(r.Game.Hands[loserID])})

	// Remove loser from active
	r.Game.Eliminated = append(r.Game.Eliminated, loserID)
	for i, uid := range r.Game.ActivePlayers {
		if uid == loserID {
			r.Game.ActivePlayers = append(r.Game.ActivePlayers[:i], r.Game.ActivePlayers[i+1:]...)
			break
		}
	}

	r.Broadcast(ws.S2CPlayerEliminated{Type: ws.S2CTypePlayerEliminated, PlayerID: loserID})

	// Check end condition
	if len(r.Game.ActivePlayers) <= 1 {
		r.settleRound()
		return
	}

	// Adjust TurnIndex if needed — if the removed player was before current turn,
	// shift index back
	if r.Game.TurnIndex >= len(r.Game.ActivePlayers) {
		r.Game.TurnIndex = 0
	}

	r.broadcastTurnChange()
	r.startTimer()

	// If next player is a bot, trigger
	nextID := r.Game.ActivePlayers[r.Game.TurnIndex]
	nextPlayer := r.playerByID(nextID)
	if nextPlayer != nil && nextPlayer.IsBot {
		r.triggerBotAction(nextID)
	}
}

// HandleShowdown reveals all hands when only 2 players remain.
func (r *Room) HandleShowdown(userID int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.Game == nil || r.Game.Phase != PhaseBetting {
		return
	}
	if len(r.Game.ActivePlayers) != 2 {
		return
	}

	// Verify user is one of the active players
	if r.FindActivePlayerIndex(userID) < 0 {
		return
	}

	// Evaluate both hands
	players := make([]ws.ShowdownPlayer, 0, 2)
	for _, uid := range r.Game.ActivePlayers {
		result := game.EvaluateHand(r.Game.Hands[uid])
		players = append(players, ws.ShowdownPlayer{
			ID:       uid,
			Cards:    toWSCards(r.Game.Hands[uid]),
			HandType: result.HandType,
			HandRank: result.HandRank,
		})
	}

	r.Game.Phase = PhaseShowdown

	r.Broadcast(ws.S2CShowdown{Type: ws.S2CTypeShowdown, Players: players})

	r.settleRound()
}

// autoShowdown triggers an automatic showdown when all active players
// have called since the last raise, without requiring a user request.
func (r *Room) autoShowdown() {
	if r.Game == nil || r.Game.Phase != PhaseBetting {
		return
	}
	if len(r.Game.ActivePlayers) < 2 {
		r.settleRound()
		return
	}

	// Evaluate all active hands
	players := make([]ws.ShowdownPlayer, 0, len(r.Game.ActivePlayers))
	for _, uid := range r.Game.ActivePlayers {
		result := game.EvaluateHand(r.Game.Hands[uid])
		players = append(players, ws.ShowdownPlayer{
			ID:       uid,
			Cards:    toWSCards(r.Game.Hands[uid]),
			HandType: result.HandType,
			HandRank: result.HandRank,
		})
	}

	r.Game.Phase = PhaseShowdown
	r.Broadcast(ws.S2CShowdown{Type: ws.S2CTypeShowdown, Players: players})
	r.settleRound()
}

// settleRound determines the winner, awards the pot, records results,
// and checks for game-over conditions.
func (r *Room) settleRound() {
	if r.Game == nil {
		return
	}

	r.Game.Phase = PhaseSettle

	var winnerID int
	var winnerHandType string

	if len(r.Game.ActivePlayers) == 1 {
		// Last man standing
		winnerID = r.Game.ActivePlayers[0]
		result := game.EvaluateHand(r.Game.Hands[winnerID])
		winnerHandType = result.HandType
	} else if len(r.Game.ActivePlayers) >= 2 {
		// Compare remaining active players to find best hand
		bestUID := r.Game.ActivePlayers[0]
		bestHand := r.Game.Hands[bestUID]
		for i := 1; i < len(r.Game.ActivePlayers); i++ {
			uid := r.Game.ActivePlayers[i]
			hand := r.Game.Hands[uid]
			w := game.CompareHands(bestHand, hand)
			if w == 1 {
				bestUID = uid
				bestHand = hand
			}
		}
		winnerID = bestUID
		result := game.EvaluateHand(bestHand)
		winnerHandType = result.HandType
	} else {
		return
	}

	// Award pot to winner
	winner := r.playerByID(winnerID)
	if winner != nil {
		winner.Chips += r.Game.Pot
	}

	// Build chip deltas: delta = pot gain for winner, 0 for others (ante+bet already deducted)
	chipDeltas := make(map[int]int, len(r.Players))
	for _, p := range r.Players {
		if p.UserID == winnerID {
			chipDeltas[p.UserID] = r.Game.Pot
		} else {
			chipDeltas[p.UserID] = 0
		}
	}

	r.Broadcast(ws.S2CRoundSettle{Type: ws.S2CTypeRoundSettle, WinnerID: winnerID, HandType: winnerHandType, Pot: r.Game.Pot, ChipDeltas: chipDeltas})

	// Record game result to DB
	r.recordGameResult(winnerID)

	// Check for game over
	if r.checkGameOver() {
		return
	}

	// Reset for next hand
	for _, p := range r.Players {
		if !p.IsBot {
			p.Ready = false
		}
	}
	pot := r.Game.Pot
	r.Game = nil
	r.Status = StatusWaiting

	// Auto-start next hand after brief delay if all bots auto-ready and humans ready up
	potCopy := pot
	go func() {
		time.Sleep(3 * time.Second)
		r.mu.Lock()
		if r.Status == StatusWaiting {
			r.Status = StatusReady
			r.Game = nil
			_ = potCopy // keep for potential next hand context
		}
		r.mu.Unlock()
	}()
}

// recordGameResult persists game results to the database.
func (r *Room) recordGameResult(winnerID int) {
	if r.DB == nil {
		return
	}

	// Persist chips for all active players
	for _, p := range r.Players {
		_ = model.UpdateChips(r.DB, p.UserID, p.Chips)
	}

	// Record winner
	_ = model.RecordGameResult(r.DB, winnerID, 1)

	// Record losses for other human players
	for _, p := range r.Players {
		if p.UserID != winnerID && !p.IsBot {
			_ = model.RecordGameResult(r.DB, p.UserID, 0)
		}
	}
}

// checkGameOver determines if the game should end.
// Returns true if the game is over.
func (r *Room) checkGameOver() bool {
	playersWithChips := 0
	var lastStanding int
	for _, p := range r.Players {
		if p.Chips > 0 {
			playersWithChips++
			lastStanding = p.UserID
		}
	}

	if playersWithChips <= 1 {
		r.Status = StatusFinished
		finalChips := make(map[int]int, len(r.Players))
		for _, p := range r.Players {
			finalChips[p.UserID] = p.Chips
		}

		r.Broadcast(ws.S2CGameOver{Type: ws.S2CTypeGameOver, WinnerID: lastStanding, TotalPot: r.Game.Pot, Rounds: r.Game.RoundCount, FinalChips: finalChips})
		return true
	}

	return false
}

// advanceTurn advances to the next active player after a betting action.
// Must be called with r.mu held.
func (r *Room) advanceTurn() {
	if len(r.Game.ActivePlayers) <= 1 {
		r.settleRound()
		return
	}

	// Advance to next player, wrapping around
	n := len(r.Game.ActivePlayers)
	r.Game.TurnIndex = (r.Game.TurnIndex + 1) % n
	r.Game.TurnStart = time.Now()

	r.broadcastTurnChange()
	r.startTimer()
}

// broadcastTurnChange sends the current turn to all players.
func (r *Room) broadcastTurnChange() {
	if r.Game == nil || len(r.Game.ActivePlayers) == 0 {
		return
	}
	if r.Game.TurnIndex >= len(r.Game.ActivePlayers) {
		return
	}
	currentID := r.Game.ActivePlayers[r.Game.TurnIndex]
	r.Broadcast(ws.S2CTurnChange{Type: ws.S2CTypeTurnChange, PlayerID: currentID, ActionDeadline: r.Game.TurnStart.Add(30 * time.Second).Unix()})
}

// startTimer starts a 30-second goroutine that auto-folds the current player on timeout.
func (r *Room) startTimer() {
	if r.Game == nil || r.Game.Phase != PhaseBetting {
		return
	}
	if r.Game.TurnIndex >= len(r.Game.ActivePlayers) {
		return
	}

	turnStart := r.Game.TurnStart
	userID := r.Game.ActivePlayers[r.Game.TurnIndex]

	// Don't start timer for bots (they have their own delay via triggerBotAction)
	player := r.playerByID(userID)
	if player != nil && player.IsBot {
		return
	}

	go func() {
		select {
		case <-time.After(30 * time.Second):
			r.mu.Lock()
			// Verify the turn hasn't changed since this timer was created
			if r.Game != nil && r.Game.Phase == PhaseBetting &&
				r.Game.TurnStart == turnStart &&
				r.Game.TurnIndex < len(r.Game.ActivePlayers) &&
				r.Game.ActivePlayers[r.Game.TurnIndex] == userID {
				// Auto-fold
				r.handleFold(userID)
			}
			r.mu.Unlock()
		}
	}()
}
