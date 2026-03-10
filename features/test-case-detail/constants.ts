// constants.ts - Chứa các hằng số

export const LOAD_IMAGE_URL =
  `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/auto-test`

export const AUTO_TEST_DOM_URL =
  `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/auto-test-dom`

export const AUTO_TEST_IMAGE_URL =
  `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/auto-test-image`

export const TEST_CASE_STEP_URL =
  `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/test-steps`

export const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg)$/i

export const DEFAULT_TEST_CASE = {
  id: 1,
  testItem: "Login Functionality",
  testClassification: "Functional Test",
  runConfig: "Chrome - Desktop",
}