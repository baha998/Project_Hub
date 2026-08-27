package domain

import (
	"context"
	"time"
)

type UserRole string

const (
	UserRoleAdmin  UserRole = "ADMIN"
	UserRoleLead   UserRole = "LEAD"
	UserRoleMember UserRole = "MEMBER"
)

type User struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FullName     string    `json:"fullName" db:"full_name"`
	Role         UserRole  `json:"role" db:"role"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, limit, offset int) ([]*User, error)
}
