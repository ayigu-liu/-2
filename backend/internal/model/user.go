package model

import (
	"database/sql"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserExists   = errors.New("用户名已存在")
	ErrAuthFailed   = errors.New("用户名或密码错误")
	ErrUserNotFound = errors.New("用户不存在")
)

type User struct {
	ID            int    `json:"id"`
	Username      string `json:"username"`
	PasswordHash  string `json:"-"`
	Nickname      string `json:"nickname"`
	Chips         int    `json:"chips"`
	TotalGames    int    `json:"totalGames"`
	TotalWins     int    `json:"totalWins"`
	TotalEarnings int    `json:"totalEarnings"`
}

func CreateUser(db *sql.DB, username, password, nickname string) (*User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	if nickname == "" {
		nickname = username
	}

	result, err := db.Exec(
		"INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)",
		username, string(hash), nickname,
	)
	if err != nil {
		// SQLite unique constraint violation
		if isUniqueConstraintErr(err) {
			return nil, ErrUserExists
		}
		return nil, err
	}

	id, _ := result.LastInsertId()
	return &User{
		ID:       int(id),
		Username: username,
		Nickname: nickname,
		Chips:    10000,
	}, nil
}

func AuthenticateUser(db *sql.DB, username, password string) (*User, error) {
	user, err := GetUserByUsername(db, username)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrAuthFailed
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrAuthFailed
	}

	return user, nil
}

func GetUserByID(db *sql.DB, id int) (*User, error) {
	row := db.QueryRow(
		"SELECT id, username, password_hash, nickname, chips, total_games, total_wins, total_earnings FROM users WHERE id = ?",
		id,
	)
	u := &User{}
	err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Nickname, &u.Chips, &u.TotalGames, &u.TotalWins, &u.TotalEarnings)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	return u, err
}

func GetUserByUsername(db *sql.DB, username string) (*User, error) {
	row := db.QueryRow(
		"SELECT id, username, password_hash, nickname, chips, total_games, total_wins, total_earnings FROM users WHERE username = ?",
		username,
	)
	u := &User{}
	err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Nickname, &u.Chips, &u.TotalGames, &u.TotalWins, &u.TotalEarnings)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	return u, err
}

func UpdateChips(db *sql.DB, userID, delta int) error {
	_, err := db.Exec("UPDATE users SET chips = chips + ? WHERE id = ?", delta, userID)
	return err
}

func RecordGameResult(db *sql.DB, userID, addedChips int) error {
	_, err := db.Exec(
		"UPDATE users SET total_games = total_games + 1, total_wins = total_wins + CASE WHEN ? > 0 THEN 1 ELSE 0 END, total_earnings = total_earnings + ?, chips = chips + ? WHERE id = ?",
		addedChips, addedChips, addedChips, userID,
	)
	return err
}

func isUniqueConstraintErr(err error) bool {
	return err != nil && (err.Error() == "UNIQUE constraint failed: users.username")
}
