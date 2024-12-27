const API_URL = "https://rithm-jeopardy.herokuapp.com/api/categories?count=100";
const NUMBER_OF_CATEGORIES = 6;
const NUMBER_OF_CLUES_PER_CATEGORY = 5;

let categories = [];
let activeClue = null;
let activeClueMode = 0;
let totalScore = 0;

let isPlayButtonClickable = true;

$("#play").on("click", handleClickOfPlay);

function handleClickOfPlay() {
  resetDOM();
  setupTheGame();
}

async function setupTheGame() {
  showSpinner();

  const categoryIds = await getCategoryIds();
  const categoryPromises = categoryIds.map((id) => getCategoryData(id));
  categories = await Promise.all(categoryPromises);

  fillTable(categories);
  hideSpinner();
  totalScore = 0;
  updateScore();
}

function updateScore() {
  if (!$("#score-box").length) {
    $("<div id='score-box'>").text(`Total Score: $${totalScore}`).appendTo("body");
  } else {
    $("#score-box").text(`Total Score: $${totalScore}`);
  }
}

function sanitizeCategoryTitle(title) {
  const replacements = {
    '"ac"/"dc"': "Electricity & Physics",
  };
  return replacements[title] || title;
}

function sanitizeQuestion(question) {
  return question.charAt(0).toUpperCase() + question.slice(1);
}

async function getCategoryIds() {
  const response = await axios.get(API_URL);
  const validCategories = response.data.filter(
    (category) => category.clues_count >= NUMBER_OF_CLUES_PER_CATEGORY
  );
  const randomCategories = _.sampleSize(validCategories, NUMBER_OF_CATEGORIES);
  return randomCategories.map((category) => category.id);
}

async function getCategoryData(categoryId) {
  const response = await axios.get(
    `https://rithm-jeopardy.herokuapp.com/api/category?id=${categoryId}`
  );
  const clues = response.data.clues.slice(0, NUMBER_OF_CLUES_PER_CATEGORY).map((clue, index) => ({
    id: clue.id,
    value: (index + 1) * 100,
    question: sanitizeQuestion(clue.question),
    answer: clue.answer,
  }));

  return {
    id: categoryId,
    title: sanitizeCategoryTitle(response.data.title),
    clues,
  };
}

function fillTable(categories) {
  const $categoriesRow = $("#categories");
  const $cluesRow = $("#clues");

  categories.forEach((category) => {
    const $categoryHeader = $("<th>").text(category.title).css({
      fontFamily: "Georgia, serif",
      fontSize: "1.3em",
      textTransform: "capitalize",
      padding: "15px",
      backgroundColor: "#3b5998",
      color: "#fff",
      borderBottom: "2px solid #fff",
    });
    $categoriesRow.append($categoryHeader);

    const $categoryColumn = $("<td>");
    category.clues.forEach((clue) => {
      const $clueCell = $("<div>")
        .addClass("clue")
        .attr("id", `${category.id}-${clue.id}`)
        .text(`$${clue.value}`)
        .on("click", handleClickOfClue);
      $categoryColumn.append($clueCell);
    });
    $cluesRow.append($categoryColumn);
  });
}

function handleClickOfClue(event) {
  if (activeClueMode !== 0) return;

  const [categoryId, clueId] = event.currentTarget.id.split("-").map(Number);
  const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
  const clueIndex = categories[categoryIndex].clues.findIndex((cl) => cl.id === clueId);

  activeClue = categories[categoryIndex].clues[clueIndex];
  categories[categoryIndex].clues.splice(clueIndex, 1);
  if (categories[categoryIndex].clues.length === 0) {
    categories.splice(categoryIndex, 1);
  }

  $(event.currentTarget).addClass("viewed");
  $("#active-clue").html(
    `<div class='question'>${activeClue.question}</div>
    <input type='text' id='answer-box' placeholder='Your Answer' />
    <button id='submit-answer'>Submit</button>`
  );

  $("#submit-answer").on("click", handleAnswerSubmission);
  activeClueMode = 1;
}

function handleAnswerSubmission() {
  const userAnswer = $("#answer-box").val().trim().toLowerCase();
  const correctAnswer = activeClue.answer.trim().toLowerCase();

  if (userAnswer === correctAnswer) {
    $("#active-clue").html("Correct! Good job!");
    totalScore += activeClue.value;
  } else {
    $("#active-clue").html(
      `Incorrect. The correct answer was: <strong>${activeClue.answer}</strong>`
    );
    totalScore -= activeClue.value;
  }

  updateScore();
  activeClueMode = 2;
  setTimeout(() => {
    $("#active-clue").html(null);
    activeClueMode = 0;
  }, 3000);
}

function resetDOM() {
  $("#categories").empty();
  $("#clues").empty();
  $("#active-clue").empty();
  $("#score-box").remove();
  $("#play").text("Restart the Game!");
}

function showSpinner() {
  $("#spinner").removeClass("disabled");
}

function hideSpinner() {
  $("#spinner").addClass("disabled");
}
