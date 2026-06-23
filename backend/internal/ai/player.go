package ai

import (
	"math/rand"
	"time"

	"zha-jinhua/internal/game"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// BotDecision decides the bot's action.
// Returns (action, amount) where action is one of: call, raise, fold, blind_bet.
func BotDecision(hand [3]game.Card, seen bool, pot, currentBet, chips, activeCount int) (string, int) {
	eval := game.EvaluateHand(hand)
	r := rand.Float64()

	// Adjust fold rate based on number of active players
	foldMod := 1.0
	if activeCount <= 3 {
		foldMod = 0.5 // more aggressive when few players
	}

	// If blind (haven't looked), less likely to fold, use blind_bet
	if !seen {
		foldMod *= 0.7
	}

	switch eval.HandType {
	case game.HandTypeBaoZi, game.HandTypeTongHuaShun:
		if r < 0.80 {
			// Raise 3x
			amount := currentBet * 3
			if amount > chips {
				amount = chips
			}
			if !seen {
				return "blind_bet", amount / 2
			}
			return "raise", amount
		}
		if !seen {
			return "blind_bet", currentBet / 2
		}
		return "call", currentBet

	case game.HandTypeJinHua, game.HandTypeShunZi:
		if r < 0.30 {
			amount := currentBet * 2
			if amount > chips {
				amount = chips
			}
			if !seen {
				return "blind_bet", amount / 2
			}
			return "raise", amount
		}
		if r < 0.90 {
			if !seen {
				return "blind_bet", currentBet / 2
			}
			return "call", currentBet
		}
		return "fold", 0

	case game.HandTypeDuiZi:
		if r < 0.10*foldMod {
			amount := currentBet * 2
			if amount > chips {
				amount = chips
			}
			if !seen {
				return "blind_bet", amount / 2
			}
			return "raise", amount
		}
		if r < 0.70*foldMod {
			if !seen {
				return "blind_bet", currentBet / 2
			}
			return "call", currentBet
		}
		return "fold", 0

	default: // SanPai (high card)
		highCard := eval.TieBreakers[0]
		if highCard >= 14 { // has an Ace
			if r < 0.20*foldMod {
				if !seen {
					return "blind_bet", currentBet / 2
				}
				return "call", currentBet
			}
			return "fold", 0
		}
		if r < 0.05*foldMod {
			if !seen {
				return "blind_bet", currentBet / 2
			}
			return "call", currentBet
		}
		return "fold", 0
	}
}

// BotDelay returns a random delay mimicking human reaction time (500-1500ms).
func BotDelay() time.Duration {
	return time.Duration(500+rand.Intn(1000)) * time.Millisecond
}
