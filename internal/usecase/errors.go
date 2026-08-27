package usecase

import "errors"

var (
	// ErrEmailTaken is returned by AuthUsecase.Register when the email is
	// already registered to another account.
	ErrEmailTaken = errors.New("email already registered")

	// ErrInvalidCredentials is returned by AuthUsecase.Login when the email
	// does not exist or the password does not match.
	ErrInvalidCredentials = errors.New("invalid email or password")

	// ErrForbidden is returned when the caller's role does not permit the
	// requested operation.
	ErrForbidden = errors.New("caller is not permitted to perform this action")

	// ErrInvalidAdminSecret is returned by AuthUsecase.Register when the
	// caller requests the ADMIN (curator) role without supplying the
	// correct admin secret key.
	ErrInvalidAdminSecret = errors.New("invalid admin secret key")

	// ErrInvalidAssignee is returned by TaskUsecase.Create/Update when the
	// given assigneeId is not a well-formed UUID or does not match an
	// existing user.
	ErrInvalidAssignee = errors.New("assignee does not exist")

	// ErrOwnerNotFound is returned by ProjectUsecase.Create when the
	// caller's own JWT-derived user ID no longer names an existing user
	// (e.g. the account was deleted, or the token was issued against a
	// different database) — an authentication problem, not a validation
	// error in the request body.
	ErrOwnerNotFound = errors.New("authenticated user no longer exists")
)
