Correção 3 — Chamar assign_speed_points ao fechar a questão
No useAdminControls.ts, na função closeQuestion, adicione a chamada após o calculate_question_result:
typescript// Após calculate_question_result, adicione:
await supabase.rpc('assign_speed_points', {
  p_session_id: sessionId,
  p_question_id: currentQuestionId
})