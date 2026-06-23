package game

import "sort"

// Hand types ordered from highest to lowest.
const (
	HandTypeBaoZi       = "豹子"      // Three of a kind
	HandTypeTongHuaShun = "同花顺"    // Straight flush
	HandTypeJinHua      = "金花"      // Flush
	HandTypeShunZi      = "顺子"      // Straight
	HandTypeDuiZi       = "对子"      // Pair
	HandTypeSanPai      = "散牌"      // High card
)

var handTypeRank = map[string]int{
	HandTypeBaoZi:       6,
	HandTypeTongHuaShun: 5,
	HandTypeJinHua:      4,
	HandTypeShunZi:      3,
	HandTypeDuiZi:       2,
	HandTypeSanPai:      1,
}

// EvaluateResult holds the hand evaluation result.
type EvaluateResult struct {
	HandType    string
	HandRank    int      // numeric rank of hand type for comparison
	TieBreakers []int    // sequential values for tie-breaking within same hand type
}

// EvaluateHand evaluates a 3-card hand.
// It handles special rules: A-2-3 as smallest straight, and returns
// tie-breakers for comparison.
func EvaluateHand(cards [3]Card) EvaluateResult {
	// Sort by rank ascending for consistent analysis
	sorted := cards[:]
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Rank < sorted[j].Rank
	})

	isFlush := isFlush(sorted)
	isStraight, straightHigh := isStraight(sorted)

	switch {
	case isFlush && isStraight:
		return EvaluateResult{
			HandType:    HandTypeTongHuaShun,
			HandRank:    handTypeRank[HandTypeTongHuaShun],
			TieBreakers: []int{straightHigh},
		}
	case isBaoZi(sorted):
		return EvaluateResult{
			HandType:    HandTypeBaoZi,
			HandRank:    handTypeRank[HandTypeBaoZi],
			TieBreakers: []int{sorted[0].Rank},
		}
	case isFlush:
		return EvaluateResult{
			HandType:    HandTypeJinHua,
			HandRank:    handTypeRank[HandTypeJinHua],
			TieBreakers: sortedRanksDesc(sorted),
		}
	case isStraight:
		return EvaluateResult{
			HandType:    HandTypeShunZi,
			HandRank:    handTypeRank[HandTypeShunZi],
			TieBreakers: []int{straightHigh},
		}
	}

	// Check pair
	if pairRank, ok := isPair(sorted); ok {
		// Find the kicker (non-pair card)
		var kicker int
		for _, c := range sorted {
			if c.Rank != pairRank {
				kicker = c.Rank
				break
			}
		}
		return EvaluateResult{
			HandType:    HandTypeDuiZi,
			HandRank:    handTypeRank[HandTypeDuiZi],
			TieBreakers: []int{pairRank, kicker},
		}
	}

	// San pai (high card)
	return EvaluateResult{
		HandType:    HandTypeSanPai,
		HandRank:    handTypeRank[HandTypeSanPai],
		TieBreakers: sortedRanksDesc(sorted),
	}
}

// CompareHands compares two 3-card hands.
// Returns 0 if hand a wins, 1 if hand b wins.
// Special rule: 不同花 2-3-5 beats 豹子 (three of a kind).
func CompareHands(a, b [3]Card) int {
	ra := EvaluateHand(a)
	rb := EvaluateHand(b)

	// Special rule: 235 beats 豹子 (only when 235 is not a straight)
	if is235(a) && rb.HandType == HandTypeBaoZi {
		return 0
	}
	if is235(b) && ra.HandType == HandTypeBaoZi {
		return 1
	}

	// Compare hand type rank first
	if ra.HandRank != rb.HandRank {
		if ra.HandRank > rb.HandRank {
			return 0
		}
		return 1
	}

	// Same hand type: compare tie-breakers
	for i := 0; i < len(ra.TieBreakers) && i < len(rb.TieBreakers); i++ {
		if ra.TieBreakers[i] != rb.TieBreakers[i] {
			if ra.TieBreakers[i] > rb.TieBreakers[i] {
				return 0
			}
			return 1
		}
	}

	// Completely tied (extremely rare in 3-card poker)
	// Continue comparing by highest card if needed
	return 0 // a wins (defense wins in ties by challenger convention)
}

// isFlush checks if all cards have the same suit.
func isFlush(cards []Card) bool {
	return cards[0].Suit == cards[1].Suit && cards[1].Suit == cards[2].Suit
}

// isStraight checks if 3 cards form a straight.
// Returns (true, highCardRank). For A-2-3 returns (true, 3).
// Cards must be sorted ascending by rank.
func isStraight(cards []Card) (bool, int) {
	r0, r1, r2 := cards[0].Rank, cards[1].Rank, cards[2].Rank

	// Normal straight: consecutive ranks
	if r1 == r0+1 && r2 == r1+1 {
		return true, r2
	}

	// A-2-3 special case: ranks 14, 2, 3 (sorted: 2, 3, 14)
	if r0 == 2 && r1 == 3 && r2 == 14 {
		return true, 3 // A-2-3 is the smallest straight, high card is 3
	}

	return false, 0
}

// isBaoZi checks for three of a kind.
func isBaoZi(cards []Card) bool {
	return cards[0].Rank == cards[1].Rank && cards[1].Rank == cards[2].Rank
}

// isPair checks for exactly two cards of the same rank.
// Returns (pairRank, true) if found.
func isPair(cards []Card) (int, bool) {
	if cards[0].Rank == cards[1].Rank {
		return cards[0].Rank, true
	}
	if cards[1].Rank == cards[2].Rank {
		return cards[1].Rank, true
	}
	if cards[0].Rank == cards[2].Rank {
		return cards[0].Rank, true
	}
	return 0, false
}

// is235 checks if the hand is exactly 2-3-5 of different suits.
func is235(cards [3]Card) bool {
	ranks := []int{cards[0].Rank, cards[1].Rank, cards[2].Rank}
	sort.Ints(ranks)

	// Must be ranks 2, 3, 5
	if ranks[0] != 2 || ranks[1] != 3 || ranks[2] != 5 {
		return false
	}

	// Must be different suits (not a flush)
	return !isFlush(cards[:])
}

// sortedRanksDesc returns ranks sorted descending.
func sortedRanksDesc(cards []Card) []int {
	r := make([]int, len(cards))
	for i, c := range cards {
		r[i] = c.Rank
	}
	sort.Sort(sort.Reverse(sort.IntSlice(r)))
	return r
}
