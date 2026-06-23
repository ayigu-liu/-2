package game

import (
	"testing"
)

func TestBaoZi(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "hearts", Rank: 14}, {Suit: "clubs", Rank: 14}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeBaoZi {
		t.Errorf("expected 豹子, got %s", r.HandType)
	}
	if r.TieBreakers[0] != 14 {
		t.Errorf("expected tie breaker 14, got %d", r.TieBreakers[0])
	}
}

func TestTongHuaShun(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 13}, {Suit: "spades", Rank: 12}, {Suit: "spades", Rank: 11}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeTongHuaShun {
		t.Errorf("expected 同花顺, got %s", r.HandType)
	}
	if r.TieBreakers[0] != 13 {
		t.Errorf("expected tie breaker 13, got %d", r.TieBreakers[0])
	}
}

func TestA23TongHuaShun(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "spades", Rank: 2}, {Suit: "spades", Rank: 3}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeTongHuaShun {
		t.Errorf("expected 同花顺 for A23, got %s", r.HandType)
	}
	if r.TieBreakers[0] != 3 {
		t.Errorf("expected tie breaker 3 for A23 (smallest straight), got %d", r.TieBreakers[0])
	}
}

func TestJinHua(t *testing.T) {
	hand := [3]Card{{Suit: "hearts", Rank: 14}, {Suit: "hearts", Rank: 8}, {Suit: "hearts", Rank: 3}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeJinHua {
		t.Errorf("expected 金花, got %s", r.HandType)
	}
}

func TestShunZi(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 8}, {Suit: "hearts", Rank: 7}, {Suit: "clubs", Rank: 6}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeShunZi {
		t.Errorf("expected 顺子, got %s", r.HandType)
	}
	if r.TieBreakers[0] != 8 {
		t.Errorf("expected tie breaker 8, got %d", r.TieBreakers[0])
	}
}

func TestA23ShunZi(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "hearts", Rank: 2}, {Suit: "clubs", Rank: 3}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeShunZi {
		t.Errorf("expected 顺子 for A23, got %s", r.HandType)
	}
	if r.TieBreakers[0] != 3 {
		t.Errorf("expected tie breaker 3 for A23, got %d", r.TieBreakers[0])
	}
}

func TestDuiZi(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 10}, {Suit: "hearts", Rank: 10}, {Suit: "clubs", Rank: 5}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeDuiZi {
		t.Errorf("expected 对子, got %s", r.HandType)
	}
	if r.TieBreakers[0] != 10 {
		t.Errorf("expected pair rank 10, got %d", r.TieBreakers[0])
	}
	if r.TieBreakers[1] != 5 {
		t.Errorf("expected kicker 5, got %d", r.TieBreakers[1])
	}
}

func TestSanPai(t *testing.T) {
	hand := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "hearts", Rank: 9}, {Suit: "clubs", Rank: 3}}
	r := EvaluateHand(hand)
	if r.HandType != HandTypeSanPai {
		t.Errorf("expected 散牌, got %s", r.HandType)
	}
}

// --- Comparison tests ---

func TestBaoZiBeatsTongHuaShun(t *testing.T) {
	baozi := [3]Card{{Suit: "spades", Rank: 7}, {Suit: "hearts", Rank: 7}, {Suit: "clubs", Rank: 7}}
	ths := [3]Card{{Suit: "spades", Rank: 6}, {Suit: "spades", Rank: 5}, {Suit: "spades", Rank: 4}}
	if w := CompareHands(baozi, ths); w != 0 {
		t.Errorf("expected 豹子 to beat 同花顺")
	}
}

func Test235BeatsBaoZi(t *testing.T) {
	twentyThreeFive := [3]Card{{Suit: "spades", Rank: 2}, {Suit: "hearts", Rank: 3}, {Suit: "clubs", Rank: 5}}
	baozi := [3]Card{{Suit: "spades", Rank: 10}, {Suit: "hearts", Rank: 10}, {Suit: "clubs", Rank: 10}}
	if w := CompareHands(twentyThreeFive, baozi); w != 0 {
		t.Errorf("expected 235 to beat 豹子")
	}
}

func TestA23SmallestShunZi(t *testing.T) {
	a23 := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "hearts", Rank: 2}, {Suit: "clubs", Rank: 3}}
	t234 := [3]Card{{Suit: "spades", Rank: 2}, {Suit: "hearts", Rank: 3}, {Suit: "clubs", Rank: 4}}
	if w := CompareHands(a23, t234); w != 1 {
		t.Errorf("expected 2-3-4 to beat A-2-3 (A23 smallest)")
	}
}

func TestAKQBeatsA23(t *testing.T) {
	akq := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "hearts", Rank: 13}, {Suit: "clubs", Rank: 12}}
	a23 := [3]Card{{Suit: "spades", Rank: 14}, {Suit: "hearts", Rank: 2}, {Suit: "clubs", Rank: 3}}
	if w := CompareHands(akq, a23); w != 0 {
		t.Errorf("expected AKQ to beat A23")
	}
}

func TestHigherTongHuaShun(t *testing.T) {
	high := [3]Card{{Suit: "spades", Rank: 13}, {Suit: "spades", Rank: 12}, {Suit: "spades", Rank: 11}}
	low := [3]Card{{Suit: "hearts", Rank: 6}, {Suit: "hearts", Rank: 5}, {Suit: "hearts", Rank: 4}}
	if w := CompareHands(high, low); w != 0 {
		t.Errorf("expected K-high 同花顺 to beat 6-high")
	}
}

func TestSamePairCompare(t *testing.T) {
	a := [3]Card{{Suit: "spades", Rank: 8}, {Suit: "hearts", Rank: 8}, {Suit: "clubs", Rank: 14}}
	b := [3]Card{{Suit: "spades", Rank: 8}, {Suit: "hearts", Rank: 8}, {Suit: "clubs", Rank: 13}}
	if w := CompareHands(a, b); w != 0 {
		t.Errorf("expected pair 8 with A kicker to beat pair 8 with K kicker")
	}
}

func TestNewDeckSize(t *testing.T) {
	deck := NewDeck()
	if len(deck) != 52 {
		t.Errorf("expected 52 cards, got %d", len(deck))
	}
}

func TestDealCards(t *testing.T) {
	deck := NewDeck()
	hands := DealCards(deck, 4)
	if len(hands) != 4 {
		t.Errorf("expected 4 hands, got %d", len(hands))
	}
	for i, hand := range hands {
		if len(hand) != 3 {
			t.Errorf("hand %d: expected 3 cards, got %d", i, len(hand))
		}
	}
}
