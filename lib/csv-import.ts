import { supabase } from "@/lib/supabase"

export type QuestionImportData = {
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  answer: string
}

export const parseCSV = (csvText: string): QuestionImportData[] => {
  // Split the CSV text into lines
  const lines = csvText.split("\n").filter((line) => line.trim() !== "")

  // Check if there's a header row
  const hasHeader =
    lines[0].toLowerCase().includes("question") &&
    lines[0].toLowerCase().includes("option") &&
    lines[0].toLowerCase().includes("answer")

  // Start from index 1 if there's a header, otherwise from 0
  const startIndex = hasHeader ? 1 : 0

  const questions: QuestionImportData[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === "") continue

    // Split by comma, but handle quoted values
    const values: string[] = []
    let currentValue = ""
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ""
      } else {
        currentValue += char
      }
    }

    // Add the last value
    values.push(currentValue.trim())

    // Ensure we have exactly 6 values (question, 4 options, answer)
    if (values.length === 6) {
      const [question, optionA, optionB, optionC, optionD, answer] = values

      // Validate the answer is one of A, B, C, D (case insensitive)
      const normalizedAnswer = answer.toUpperCase()
      if (["A", "B", "C", "D"].includes(normalizedAnswer)) {
        questions.push({
          question,
          optionA,
          optionB,
          optionC,
          optionD,
          answer: normalizedAnswer,
        })
      }
    }
  }

  return questions
}

export const importQuestionsToExam = async (examId: string, questions: QuestionImportData[]) => {
  try {
    // For each question in the CSV
    for (const question of questions) {
      // 1. Create the question
      const { data: questionData, error: questionError } = await supabase
        .from("exam_questions")
        .insert({
          exam_id: examId,
          question_text: question.question,
          question_order: 0, // Will need to be updated later
        })
        .select()
        .single()

      if (questionError || !questionData) {
        console.error("Error creating question:", questionError)
        continue
      }

      // 2. Create the options
      const options = [
        {
          option_text: question.optionA,
          option_label: "a",
          is_correct: question.answer === "A",
        },
        {
          option_text: question.optionB,
          option_label: "b",
          is_correct: question.answer === "B",
        },
        {
          option_text: question.optionC,
          option_label: "c",
          is_correct: question.answer === "C",
        },
        {
          option_text: question.optionD,
          option_label: "d",
          is_correct: question.answer === "D",
        },
      ]

      for (const option of options) {
        const { error: optionError } = await supabase.from("exam_options").insert({
          question_id: questionData.id,
          option_text: option.option_text,
          option_label: option.option_label,
          is_correct: option.is_correct,
        })

        if (optionError) {
          console.error("Error creating option:", optionError)
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error importing questions:", error)
    return { success: false, error }
  }
}
