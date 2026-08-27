package usecase

import (
	"context"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"

	"github.com/baha998/Project_Hub/internal/domain"
	"github.com/baha998/Project_Hub/pkg/jwt"
)

// AuthUsecase handles registration and password-based login, issuing JWT
// access tokens on successful authentication.
type AuthUsecase struct {
	users          domain.UserRepository
	tokens         *jwt.Manager
	adminSecretKey string
}

func NewAuthUsecase(users domain.UserRepository, tokens *jwt.Manager, adminSecretKey string) *AuthUsecase {
	return &AuthUsecase{users: users, tokens: tokens, adminSecretKey: adminSecretKey}
}

// Register creates a new user with a bcrypt-hashed password. Public,
// self-service registration may only grant the LEAD or MEMBER role —
// requesting ADMIN (curator) additionally requires adminSecret to match the
// configured ADMIN_SECRET_KEY, so nobody can self-grant curator privileges
// simply by posting role: "ADMIN". It fails with ErrInvalidAdminSecret if
// role is ADMIN and the secret doesn't match, or ErrEmailTaken if the email
// is already registered.
func (uc *AuthUsecase) Register(ctx context.Context, email, password, fullName string, role domain.UserRole, adminSecret string) (*domain.User, error) {
	if role == domain.UserRoleAdmin && adminSecret != uc.adminSecretKey {
		return nil, ErrInvalidAdminSecret
	}

	existing, err := uc.users.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("checking existing user by email: %w", err)
	}
	if existing != nil {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}

	user := &domain.User{
		Email:        email,
		PasswordHash: string(hash),
		FullName:     fullName,
		Role:         role,
	}
	if err := uc.users.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}
	return user, nil
}

// Login verifies the given credentials and, on success, returns a signed
// JWT access token carrying the user's ID and role alongside the user
// record. It fails with ErrInvalidCredentials on any lookup or password
// mismatch, without distinguishing which failed.
func (uc *AuthUsecase) Login(ctx context.Context, email, password string) (string, *domain.User, error) {
	user, err := uc.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, fmt.Errorf("looking up user by email: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	token, err := uc.tokens.Generate(user.ID, string(user.Role))
	if err != nil {
		return "", nil, fmt.Errorf("generating access token: %w", err)
	}
	return token, user, nil
}
