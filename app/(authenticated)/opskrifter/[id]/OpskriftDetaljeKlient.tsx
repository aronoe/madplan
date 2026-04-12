"use client";

import { useEffect, useState, useRef } from "react";
import {
  getIngredientsForRecipe,
  getRecipeSteps,
  addRecipeStep,
  updateRecipeStep,
  deleteRecipeStep,
  uploadStepImage,
  updateRecipe,
} from "@/lib/queries";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OpskriftDetaljeKlient({
  recipe: initialRecipe,
  userId,
}: {
  recipe: Recipe;
  userId: string;
}) {
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(true);

  // Portion scaling
  const baseServings = recipe.servings ?? 4;
  const [servings, setServings] = useState(baseServings);
  const scale = servings / baseServings;

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(recipe.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Step adding
  const [newStepText, setNewStepText] = useState("");
  const [addingStep, setAddingStep] = useState(false);

  // Step editing
  const [editStepId, setEditStepId] = useState<string | null>(null);
  const [editStepText, setEditStepText] = useState("");

  // Image uploading
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetStepId = useRef<string | null>(null);

  useEffect(() => {
    getIngredientsForRecipe(recipe.id)
      .then(setIngredients)
      .catch(() => setIngredients([]))
      .finally(() => setLoadingIngredients(false));

    getRecipeSteps(recipe.id)
      .then(setSteps)
      .catch(() => setSteps([]))
      .finally(() => setLoadingSteps(false));
  }, [recipe.id]);

  // ── Notes ──────────────────────────────────────────────────────────────────

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateRecipe(recipe.id, { notes: notesValue.trim() || null });
      setRecipe((r) => ({ ...r, notes: notesValue.trim() || null }));
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  }

  // ── Steps ──────────────────────────────────────────────────────────────────

  async function handleAddStep() {
    if (!newStepText.trim()) return;
    setAddingStep(true);
    try {
      const stepNumber = steps.length + 1;
      const newStep = await addRecipeStep(
        recipe.id,
        newStepText.trim(),
        stepNumber,
      );
      setSteps((prev) => [...prev, newStep]);
      setNewStepText("");
    } finally {
      setAddingStep(false);
    }
  }

  async function handleSaveStep(id: string) {
    if (!editStepText.trim()) return;
    await updateRecipeStep(id, { description: editStepText.trim() });
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, description: editStepText.trim() } : s,
      ),
    );
    setEditStepId(null);
  }

  async function handleDeleteStep(id: string) {
    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      // Renumber
      return filtered.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
    await deleteRecipeStep(id);
    // Persist renumbering
    const updated = steps.filter((s) => s.id !== id);
    await Promise.all(
      updated.map((s, i) => updateRecipeStep(s.id, { step_number: i + 1 })),
    );
  }

  // ── Image upload ───────────────────────────────────────────────────────────

  function triggerImageUpload(stepId: string) {
    uploadTargetStepId.current = stepId;
    fileInputRef.current?.click();
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const stepId = uploadTargetStepId.current;
    if (!file || !stepId) return;

    setUploadingStepId(stepId);
    try {
      const url = await uploadStepImage(recipe.id, stepId, file);
      await updateRecipeStep(stepId, { image_url: url });
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, image_url: url } : s)),
      );
    } finally {
      setUploadingStepId(null);
      uploadTargetStepId.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageChange}
      />

      {/* Back link */}
      <a
        href="/opskrifter"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--c-text-mid)",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 20,
        }}
      >
        ← Tilbage til opskrifter
      </a>

      {/* Hero header */}
      <div
        style={{
          background: "var(--c-card-bg)",
          borderRadius: 16,
          padding: "24px 28px",
          boxShadow: "0 2px 16px rgba(0,80,40,.08)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>{recipe.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--c-text-dark)",
                margin: "0 0 8px",
                lineHeight: 1.2,
              }}
            >
              {recipe.name}
            </h1>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--c-text-muted)" }}>
                ⏱ {recipe.time_minutes} min
              </span>
              {recipe.category && (
                <span style={{ fontSize: 13, color: "var(--c-text-muted)" }}>
                  📂 {recipe.category}
                </span>
              )}
              {recipe.tags?.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 12,
                    background: "var(--c-tag-bg)",
                    color: "var(--c-tag-text)",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column grid: ingredients + steps */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── Ingredients column ── */}
        <div>
          <div
            style={{
              background: "var(--c-card-bg)",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 1px 8px rgba(0,80,40,.06)",
              position: "sticky",
              top: 84,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "var(--c-text-dark)",
                fontSize: 15,
                marginBottom: 14,
              }}
            >
              🥕 Ingredienser
            </div>

            {/* Portion scaler */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                background: "var(--c-active-bg)",
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--c-text-mid)",
                  fontWeight: 700,
                  flex: 1,
                }}
              >
                Portioner
              </span>
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                style={scalerBtnStyle}
              >
                −
              </button>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--c-text-dark)",
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {servings}
              </span>
              <button
                onClick={() => setServings((s) => s + 1)}
                style={scalerBtnStyle}
              >
                +
              </button>
            </div>

            {loadingIngredients ? (
              <div style={{ color: "var(--c-text-muted)", fontSize: 13 }}>
                Henter…
              </div>
            ) : ingredients.length === 0 ? (
              <div style={{ color: "var(--c-text-muted)", fontSize: 13 }}>
                Ingen ingredienser endnu.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                      fontSize: 14,
                      borderBottom: "1px solid var(--c-border)",
                      paddingBottom: 6,
                    }}
                  >
                    <span
                      style={{ color: "var(--c-text-dark)", fontWeight: 500 }}
                    >
                      {ing.name}
                    </span>
                    <span
                      style={{
                        color: "var(--c-text-mid)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        fontSize: 13,
                      }}
                    >
                      {formatAmount(ing.amount * scale)} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Steps + Notes column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Steps */}
          <div
            style={{
              background: "var(--c-card-bg)",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 1px 8px rgba(0,80,40,.06)",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "var(--c-text-dark)",
                fontSize: 15,
                marginBottom: 16,
              }}
            >
              👨‍🍳 Fremgangsmåde
            </div>

            {loadingSteps ? (
              <div style={{ color: "var(--c-text-muted)", fontSize: 13 }}>
                Henter trin…
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {steps.map((step) => (
                  <div key={step.id}>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Step number bubble */}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          color: "white",
                          fontWeight: 800,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {step.step_number}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editStepId === step.id ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            <textarea
                              value={editStepText}
                              onChange={(e) => setEditStepText(e.target.value)}
                              rows={3}
                              style={{ ...textareaStyle, fontSize: 14 }}
                              autoFocus
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleSaveStep(step.id)}
                                style={primarySmallBtnStyle}
                              >
                                Gem
                              </button>
                              <button
                                onClick={() => setEditStepId(null)}
                                style={ghostSmallBtnStyle}
                              >
                                Annuller
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              color: "var(--c-text-dark)",
                              lineHeight: 1.6,
                            }}
                          >
                            {step.description}
                          </p>
                        )}

                        {/* Step image */}
                        {step.image_url && (
                          <img
                            src={step.image_url}
                            alt={`Trin ${step.step_number}`}
                            style={{
                              marginTop: 10,
                              width: "100%",
                              borderRadius: 10,
                              objectFit: "cover",
                              maxHeight: 220,
                            }}
                          />
                        )}
                      </div>

                      {/* Step actions */}
                      {editStepId !== step.id && (
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => triggerImageUpload(step.id)}
                            disabled={uploadingStepId === step.id}
                            style={iconActionBtn}
                            title="Upload billede"
                          >
                            {uploadingStepId === step.id ? "⏳" : "📷"}
                          </button>
                          <button
                            onClick={() => {
                              setEditStepId(step.id);
                              setEditStepText(step.description);
                            }}
                            style={iconActionBtn}
                            title="Rediger trin"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            style={{ ...iconActionBtn, color: "var(--color-danger)" }}
                            title="Slet trin"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Divider between steps */}
                    {step.step_number < steps.length && (
                      <div
                        style={{
                          marginLeft: 40,
                          marginTop: 12,
                          borderTop: "1px dashed var(--c-border)",
                        }}
                      />
                    )}
                  </div>
                ))}

                {/* Add step form */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginTop: steps.length > 0 ? 8 : 0,
                    paddingTop: steps.length > 0 ? 12 : 0,
                    borderTop:
                      steps.length > 0 ? "1px solid var(--c-border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--c-border)",
                      color: "var(--c-text-muted)",
                      fontWeight: 800,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {steps.length + 1}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <textarea
                      placeholder="Beskriv næste trin…"
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      rows={2}
                      style={textareaStyle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                          handleAddStep();
                      }}
                    />
                    <button
                      onClick={handleAddStep}
                      disabled={addingStep || !newStepText.trim()}
                      style={{
                        ...primarySmallBtnStyle,
                        opacity: addingStep || !newStepText.trim() ? 0.5 : 1,
                        cursor:
                          addingStep || !newStepText.trim()
                            ? "not-allowed"
                            : "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      {addingStep ? "Tilføjer…" : "+ Tilføj trin"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div
            style={{
              background: "var(--c-card-bg)",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 1px 8px rgba(0,80,40,.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "var(--c-text-dark)",
                  fontSize: 15,
                }}
              >
                📝 Noter & tips
              </div>
              {!editingNotes && (
                <button
                  onClick={() => {
                    setNotesValue(recipe.notes ?? "");
                    setEditingNotes(true);
                  }}
                  style={ghostSmallBtnStyle}
                >
                  {recipe.notes ? "Rediger" : "+ Tilføj"}
                </button>
              )}
            </div>

            {editingNotes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={4}
                  placeholder="Tips, variationer, hvad der virker godt…"
                  style={textareaStyle}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    style={{
                      ...primarySmallBtnStyle,
                      opacity: savingNotes ? 0.6 : 1,
                    }}
                  >
                    {savingNotes ? "Gemmer…" : "Gem"}
                  </button>
                  <button
                    onClick={() => setEditingNotes(false)}
                    style={ghostSmallBtnStyle}
                  >
                    Annuller
                  </button>
                </div>
              </div>
            ) : recipe.notes ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--c-text-dark)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {recipe.notes}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--c-text-muted)",
                }}
              >
                Ingen noter endnu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const scalerBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1.5px solid var(--c-border)",
  background: "var(--c-card-bg)",
  color: "var(--c-text-dark)",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid var(--c-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--c-text-dark)",
  background: "var(--c-input-bg)",
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: "inherit",
  lineHeight: 1.5,
};

const primarySmallBtnStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "7px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const ghostSmallBtnStyle: React.CSSProperties = {
  background: "var(--c-btn-bg)",
  color: "var(--c-text-body)",
  border: "1.5px solid var(--c-border)",
  borderRadius: 8,
  padding: "6px 12px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const iconActionBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--c-text-muted)",
  cursor: "pointer",
  fontSize: 14,
  padding: "3px 5px",
  borderRadius: 4,
};
