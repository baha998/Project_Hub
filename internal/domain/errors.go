package domain

import "errors"

// ErrNotFound is returned by repository implementations when a requested
// record does not exist.
var ErrNotFound = errors.New("record not found")
