package game

import (
	"math/rand"
	"time"
)

type Card struct {
	Suit string `json:"suit"`
	Rank int    `json:"rank"` // 2-14 (11=J, 12=Q, 13=K, 14=A)
}

var suits = []string{"spades", "hearts", "clubs", "diamonds"}

func NewDeck() []Card {
	deck := make([]Card, 0, 52)
	for _, suit := range suits {
		for rank := 2; rank <= 14; rank++ {
			deck = append(deck, Card{Suit: suit, Rank: rank})
		}
	}
	shuffle(deck)
	return deck
}

func shuffle(deck []Card) {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rng.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})
}

// DealCards deals n hands of 3 cards each from the deck.
// Returns slice of hands; consumes the top of the deck.
func DealCards(deck []Card, n int) [][]Card {
	if n*3 > len(deck) {
		panic("not enough cards in deck")
	}
	hands := make([][]Card, n)
	for i := 0; i < n; i++ {
		hands[i] = []Card{deck[i*3], deck[i*3+1], deck[i*3+2]}
	}
	return hands
}
