package room

import (
	"math/rand"
	"time"
)

var codeChars = []byte("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") // excludes 0, O, 1, I

func init() {
	rand.Seed(time.Now().UnixNano())
}

// GenerateRoomCode generates a 6-character room code from a restricted
// alphanumeric set (excludes easily confused characters like 0, O, 1, I).
func GenerateRoomCode() string {
	b := make([]byte, 6)
	for i := range b {
		b[i] = codeChars[rand.Intn(len(codeChars))]
	}
	return string(b)
}
