package room

import (
	"fmt"
	"time"

	"zha-jinhua/internal/ai"
)

// maybeFillBots fills the room with bot players if allow_bot is enabled
// and not enough players are present. Leaves at least 1 spot for a human.
// Returns true if bots were added.
func (r *Room) maybeFillBots() bool {
	if !r.Settings.AllowBot {
		return false
	}

	humanCount := 0
	for _, p := range r.Players {
		if !p.IsBot {
			humanCount++
		}
	}

	if humanCount == 0 {
		return false // need at least one human
	}

	added := false
	for len(r.Players) < r.Settings.MaxPlayers {
		botID := -(len(r.Players) + 1000) // negative IDs for bots
		bot := &Player{
			UserID:   botID,
			Username: fmt.Sprintf("Bot%d", -botID),
			Nickname: fmt.Sprintf("Bot-%d", -botID),
			Chips:    10000,
			Ready:    true,
			IsBot:    true,
			Conn:     nil,
		}
		r.Players = append(r.Players, bot)
		added = true
	}
	return added
}

// triggerBotAction schedules a bot's action after a delay.
func (r *Room) triggerBotAction(userID int) {
	go func() {
		time.Sleep(ai.BotDelay())

		hand := r.Game.Hands[userID]
		seen := r.Game.Seen[userID]
		action, amount := ai.BotDecision(
			hand,
			seen,
			r.Game.Pot,
			r.Game.CurrentBet,
			r.getPlayerChips(userID),
			len(r.Game.ActivePlayers),
		)

		r.HandleBet(userID, action, amount)
	}()
}

// getPlayerChips returns the chips for a player.
func (r *Room) getPlayerChips(userID int) int {
	for _, p := range r.Players {
		if p.UserID == userID {
			return p.Chips
		}
	}
	return 0
}

// handleBetAction processes a bet action from a player.
func (r *Room) handleBetAction(userID int, action string, amount int) {
	r.HandleBet(userID, action, amount)
}

// handleFold processes a fold.
func (r *Room) handleFold(userID int) {
	r.Game.Eliminated = append(r.Game.Eliminated, userID)

	// Remove from active players
	for i, uid := range r.Game.ActivePlayers {
		if uid == userID {
			r.Game.ActivePlayers = append(r.Game.ActivePlayers[:i], r.Game.ActivePlayers[i+1:]...)
			break
		}
	}

	r.Broadcast(&struct {
		Type     string `json:"type"`
		PlayerID int    `json:"player_id"`
		Action   string `json:"action"`
	}{
		Type:     "player_action",
		PlayerID: userID,
		Action:   "fold",
	})

	r.Broadcast(&struct {
		Type     string `json:"type"`
		PlayerID int    `json:"player_id"`
	}{
		Type:     "player_eliminated",
		PlayerID: userID,
	})

	if len(r.Game.ActivePlayers) <= 1 {
		r.settleRound()
		return
	}

	r.advanceTurn()

	// If next is bot, trigger
	nextUserID := r.Game.ActivePlayers[r.Game.TurnIndex]
	nextPlayer := r.playerByID(nextUserID)
	if nextPlayer != nil && nextPlayer.IsBot {
		r.triggerBotAction(nextUserID)
	}
}

func (r *Room) playerByID(userID int) *Player {
	for _, p := range r.Players {
		if p.UserID == userID {
			return p
		}
	}
	return nil
}
