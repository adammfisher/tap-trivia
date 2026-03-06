' CategoryScreen — Category reveal between questions
' Matches app.js renderCategory() behavior

sub init()
  ' ── Node refs ──
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.questionCounter = m.top.findNode("questionCounter")
  m.categoryIcon = m.top.findNode("categoryIcon")
  m.categoryName = m.top.findNode("categoryName")
  m.subcategoryName = m.top.findNode("subcategoryName")
  m.diffLabel = m.top.findNode("diffLabel")
  m.qrBadge = m.top.findNode("qrBadge")

  ' Difficulty dots (filled)
  m.dot1 = m.top.findNode("dot1")
  m.dot2 = m.top.findNode("dot2")
  m.dot3 = m.top.findNode("dot3")

  ' (empty dot nodes removed — web only shows filled dots)

  ' Animations
  m.categoryZoomAnim = m.top.findNode("categoryZoomAnim")
  m.nameFadeAnim = m.top.findNode("nameFadeAnim")
  m.diffFadeAnim = m.top.findNode("diffFadeAnim")

  m.lastCategory = ""

  fixAllLabelFonts(m.top)
end sub

sub onGameStateChanged(event as Object)
  state = event.getData()
  if state = invalid then return

  ' Update bar name
  bName = m.top.getField("barName")
  if bName <> invalid and bName <> ""
    m.barNameLabel.text = bName
  end if

  ' Update bar code on QR badge
  bCode = m.top.getField("barCode")
  if bCode <> invalid and bCode <> ""
    m.qrBadge.setField("barCode", bCode)
  end if

  ' Extract question data
  q = state.question
  if q = invalid then q = {}

  ' Question counter
  num = 1
  total = 15
  if state.questionNumber <> invalid then num = safeInt(state.questionNumber, 1)
  if state.totalQuestions <> invalid then total = safeInt(state.totalQuestions, 15)
  m.questionCounter.text = "QUESTION " + Str(num).trim() + " OF " + Str(total).trim()

  ' Category name
  category = "Trivia"
  if q.category <> invalid and q.category <> ""
    category = q.category
  else if state.category <> invalid and state.category <> ""
    category = state.category
  end if
  m.categoryName.text = category

  ' Category icon (pre-rendered emoji PNG)
  m.categoryIcon.uri = getCategoryIconUri(category)

  ' Subcategory
  sub_cat = ""
  if q.subcategory <> invalid then sub_cat = q.subcategory
  if sub_cat = "" and state.subcategory <> invalid then sub_cat = state.subcategory
  m.subcategoryName.text = sub_cat
  if sub_cat = ""
    m.subcategoryName.visible = false
  else
    m.subcategoryName.visible = true
  end if

  ' Difficulty (1-3)
  diff = 3
  if q.difficulty <> invalid then diff = safeInt(q.difficulty, 3)
  if state.difficulty <> invalid then diff = safeInt(state.difficulty, diff)
  if diff < 1 then diff = 1
  if diff > 3 then diff = 3

  updateDifficulty(diff)

  ' Trigger animations if category changed
  if category <> m.lastCategory
    m.lastCategory = category
    m.categoryZoomAnim.control = "start"
    m.nameFadeAnim.control = "start"
    m.diffFadeAnim.control = "start"
  end if
end sub

sub updateDifficulty(level as Integer)
  ' Labels
  labels = ["", "Easy", "Medium", "Hard"]
  m.diffLabel.text = labels[level]

  ' Web uses muted white for label, green dots for all levels
  m.diffLabel.color = "#ffffff66"

  ' Show filled dots up to level (always green)
  m.dot1.visible = (level >= 1)
  m.dot2.visible = (level >= 2)
  m.dot3.visible = (level >= 3)
end sub

