import type { FieldDefinition, StepDefinition, UserAnswerState, UserAnswerValue } from "../types";

export function getFieldAnswerKey(stepId: string, field: FieldDefinition, index: number) {
  return field.label ?? `${stepId}.choices.${index}`;
}

export function getDefaultFieldAnswer(field: FieldDefinition): UserAnswerValue {
  if (field.kind === "choices") {
    return field.choices?.filter((choice) => choice.active).map((choice) => choice.title) ?? [];
  }

  if (field.kind === "select") {
    return field.value ?? field.options?.[0] ?? "";
  }

  return field.value ?? "";
}

export function getEffectiveFieldAnswer(
  answers: UserAnswerState,
  stepId: string,
  field: FieldDefinition,
  index: number,
): UserAnswerValue {
  const key = getFieldAnswerKey(stepId, field, index);
  return answers[stepId]?.[key] ?? getDefaultFieldAnswer(field);
}

export function updateUserAnswer(
  answers: UserAnswerState,
  stepId: string,
  key: string,
  value: UserAnswerValue,
): UserAnswerState {
  return {
    ...answers,
    [stepId]: {
      ...answers[stepId],
      [key]: value,
    },
  };
}

export function confirmStepAnswers(
  answers: UserAnswerState,
  step: StepDefinition,
): UserAnswerState {
  const nextStepAnswers = { ...(answers[step.id] ?? {}) };

  step.fields.forEach((field, index) => {
    if (field.kind === "note") return;

    const key = getFieldAnswerKey(step.id, field, index);
    nextStepAnswers[key] = getEffectiveFieldAnswer(answers, step.id, field, index);
  });

  return {
    ...answers,
    [step.id]: nextStepAnswers,
  };
}

function findStep(steps: StepDefinition[], stepId: string) {
  return steps.find((step) => step.id === stepId) ?? null;
}

export function getTextAnswer(
  steps: StepDefinition[],
  answers: UserAnswerState,
  stepId: string,
  label: string,
) {
  const step = findStep(steps, stepId);
  if (!step) return "";

  const index = step.fields.findIndex((field) => field.label === label);
  if (index < 0) return "";

  const value = getEffectiveFieldAnswer(answers, stepId, step.fields[index], index);
  return typeof value === "string" ? value.trim() : "";
}

export function getExplicitTextAnswer(
  answers: UserAnswerState,
  stepId: string,
  label: string,
) {
  const value = answers[stepId]?.[label];
  return typeof value === "string" ? value.trim() : "";
}

export function getSelectedChoiceTitles(
  steps: StepDefinition[],
  answers: UserAnswerState,
  stepId: string,
  requiredChoiceTitle?: string,
) {
  const step = findStep(steps, stepId);
  if (!step) return [];

  const index = step.fields.findIndex(
    (field) =>
      field.kind === "choices" &&
      (!requiredChoiceTitle ||
        field.choices?.some((choice) => choice.title === requiredChoiceTitle)),
  );
  if (index < 0) return [];

  const value = getEffectiveFieldAnswer(answers, stepId, step.fields[index], index);
  return Array.isArray(value) ? value : [];
}

export function getExplicitSelectedChoiceTitles(
  steps: StepDefinition[],
  answers: UserAnswerState,
  stepId: string,
  requiredChoiceTitle?: string,
) {
  const step = findStep(steps, stepId);
  if (!step) return [];

  const index = step.fields.findIndex(
    (field) =>
      field.kind === "choices" &&
      (!requiredChoiceTitle ||
        field.choices?.some((choice) => choice.title === requiredChoiceTitle)),
  );
  if (index < 0) return [];

  const key = getFieldAnswerKey(stepId, step.fields[index], index);
  const value = answers[stepId]?.[key];
  return Array.isArray(value) ? value : [];
}
