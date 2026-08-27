package http

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/baha998/Project_Hub/internal/handler/http/middleware"
	"github.com/baha998/Project_Hub/internal/usecase"
)

// maxUploadSize caps request bodies for POST /projects/{id}/files to guard
// against unbounded memory/disk use from oversized uploads.
const maxUploadSize = 25 << 20 // 25 MB

type FileHandler struct {
	files     *usecase.FileUsecase
	uploadDir string
}

// NewFileHandler builds a FileHandler that stores uploaded files under
// uploadDir, which must already exist.
func NewFileHandler(files *usecase.FileUsecase, uploadDir string) *FileHandler {
	return &FileHandler{files: files, uploadDir: uploadDir}
}

// Upload handles POST /api/v1/projects/{id}/files: it reads a
// multipart/form-data request with a "file" field, writes it to
// uploadDir under a random name, and registers its metadata.
func (h *FileHandler) Upload(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	projectID := r.PathValue("id")

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "invalid or oversized multipart form (max 25MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, `missing "file" field in form data`)
		return
	}
	defer file.Close()

	storedName, err := randomFileName(header.Filename)
	if err != nil {
		writeInternalError(w, fmt.Errorf("generating stored file name: %w", err))
		return
	}
	storedPath := filepath.Join(h.uploadDir, storedName)

	dst, err := os.Create(storedPath)
	if err != nil {
		writeInternalError(w, fmt.Errorf("creating destination file: %w", err))
		return
	}
	defer dst.Close()

	size, err := io.Copy(dst, file)
	if err != nil {
		writeInternalError(w, fmt.Errorf("writing uploaded file: %w", err))
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	meta, err := h.files.SaveMetadata(r.Context(), projectID, header.Filename, storedPath, size, mimeType, caller.ID)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, meta)
}

// ListByProject handles GET /api/v1/projects/{id}/files.
func (h *FileHandler) ListByProject(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")

	files, err := h.files.ListByProject(r.Context(), projectID)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, files)
}

// Delete handles DELETE /api/v1/files/{id}: it removes the metadata record
// and then best-effort removes the underlying file from disk. The DB record
// is deleted first so a failed disk removal never leaves a listing pointing
// at bytes it can no longer account for.
func (h *FileHandler) Delete(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id := r.PathValue("id")

	file, err := h.files.Delete(r.Context(), id, caller.ID, caller.Role)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	if err := os.Remove(file.FilePath); err != nil && !os.IsNotExist(err) {
		log.Printf("removing file from disk %q: %v", file.FilePath, err)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// randomFileName generates a collision-resistant on-disk name that keeps
// the original extension but drops the untrusted original file name, so a
// crafted upload can't traverse directories or overwrite other files.
func randomFileName(original string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + filepath.Ext(original), nil
}
