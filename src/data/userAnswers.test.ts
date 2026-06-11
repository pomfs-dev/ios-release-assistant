import { describe, expect, it } from "vitest";
import type { StepDefinition, UserAnswerState } from "../types";
import { confirmStepAnswers, updateUserAnswer } from "./userAnswers";

const step = {
  id: "signing",
  fields: [
    {
      kind: "select",
      label: "Apple Developer 계정 상태",
      options: ["유료 Apple Developer Program 가입 완료", "아직 가입 전"],
    },
    {
      kind: "text",
      label: "Apple 개발자 팀 ID",
      value: "LT47CYB8SL",
    },
    {
      kind: "choices",
      choices: [
        {
          title: "Xcode 자동 관리",
          copy: "처음 배포하는 사용자에게 가장 안전합니다.",
          active: true,
        },
        {
          title: "직접 관리",
          copy: "인증서와 프로필을 아는 사용자만 선택합니다.",
        },
      ],
    },
    {
      kind: "note",
      value: "안내 문구",
    },
  ],
} as StepDefinition;

describe("confirmStepAnswers", () => {
  it("stores visible default values as explicit answers when the user confirms a step", () => {
    const answers = confirmStepAnswers({}, step);

    expect(answers.signing).toMatchObject({
      "Apple Developer 계정 상태": "유료 Apple Developer Program 가입 완료",
      "Apple 개발자 팀 ID": "LT47CYB8SL",
      "signing.choices.2": ["Xcode 자동 관리"],
    });
    expect(Object.keys(answers.signing)).not.toContain("signing.choices.3");
  });

  it("preserves edited values while filling untouched fields", () => {
    const editedAnswers: UserAnswerState = updateUserAnswer(
      {},
      "signing",
      "Apple 개발자 팀 ID",
      "TEAM12345",
    );

    const answers = confirmStepAnswers(editedAnswers, step);

    expect(answers.signing).toMatchObject({
      "Apple Developer 계정 상태": "유료 Apple Developer Program 가입 완료",
      "Apple 개발자 팀 ID": "TEAM12345",
    });
  });
});
