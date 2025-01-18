let currentQuestionIndex = 0;
let correctAnswers = 0;
let dailyStreak = 0;
let questions = [];
let completedQuestions = []; // Günlük doğru bilinen kelimeler
let incorrectQuestions = []; // Yanlış cevaplanan sorular
let answerHistory = [];

const STORAGE_KEY = 'quizProgress';
const COMPLETED_KEY = 'completedQuestions';
const HISTORY_KEY = 'answerHistory';

// Verileri localStorage'dan yükle
function loadProgress() {
  const savedProgress = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const savedCompletedQuestions = JSON.parse(localStorage.getItem(COMPLETED_KEY));
  const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY));
  const today = new Date().toDateString();

  if (savedProgress) {
    if (savedProgress.date === today) {
      dailyStreak = savedProgress.dailyStreak;
      correctAnswers = savedProgress.correctAnswers;
    } else {
      dailyStreak = 0; // Yeni güne başladığınızda seri sıfırlanmaz
      correctAnswers = 0;
    }
  }

  const lastCompletedDay = localStorage.getItem('lastCompletedDay');
  if (lastCompletedDay !== today && dailyStreak > 0) {
    dailyStreak = 0; // Yeni güne başladığınızda günlük seriyi sıfırlayın
  }

  if (!savedCompletedQuestions || savedCompletedQuestions.date !== today) {
    completedQuestions = [];
  } else {
    completedQuestions = savedCompletedQuestions.words;
  }

  if (savedHistory) {
    answerHistory = savedHistory;
  }
}

// Verileri localStorage'a kaydet
function saveProgress() {
  const today = new Date().toDateString();
  const progress = {
    date: today,
    dailyStreak: dailyStreak,
    correctAnswers: correctAnswers,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  localStorage.setItem(
    COMPLETED_KEY,
    JSON.stringify({ date: today, words: completedQuestions })
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(answerHistory));
}

// Konfeti patlatma fonksiyonu
function explodeConfetti() {
  confetti({
    particleCount: 200,
    spread: 70,
    origin: { x: 0.5, y: 0.5 },
  });
}

// Cevap verildiğinde günlük seriyi güncelle
function handleAnswerHistory(isCorrect, button) {
  const optionButtons = document.querySelectorAll('#options button');
  optionButtons.forEach(btn => (btn.disabled = true));

  // Cevap geçmişini kaydet
  answerHistory.push({
    question: questions[currentQuestionIndex].arabic_word,
    isCorrect: isCorrect,
  });

  const today = new Date().toDateString(); // Bugünün tarihi

  if (isCorrect) {
    correctAnswers++;
    completedQuestions.push(questions[currentQuestionIndex].arabic_word);
    button.classList.add('correct');
    button.innerHTML += ' ✅';

    // Eğer 30'un katı kadar doğru cevap verilmişse günlük seri kontrolü yapılır
    if (correctAnswers % 30 === 0) {
      const lastCompletedDay = localStorage.getItem('lastCompletedDay');

      // Eğer bugün hedef tamamlanmamışsa günlük seriyi artır ve konfeti patlat
      if (lastCompletedDay !== today) {
        dailyStreak++;
        localStorage.setItem('lastCompletedDay', today);
        explodeConfetti();
      }
    }

    // Her 10 doğru cevaptan sonra yanlış cevaplanan kelimeleri tekrar göster
    if (correctAnswers % 10 === 0 && incorrectQuestions.length > 0) {
      showIncorrectQuestions();
      return; // Karışıklığı önlemek için burada işlemi durdur
    }
  } else {
    button.classList.add('incorrect');
    button.innerHTML += ' ❌';

    // Yanlış cevaplanan soruyu geçici olarak yanlış listesine ekle
    if (!incorrectQuestions.includes(questions[currentQuestionIndex].arabic_word)) {
      incorrectQuestions.push(questions[currentQuestionIndex].arabic_word);
    }
  }

  saveProgress(); // Her cevapta ilerlemeyi kaydet

  // Soruyu geçmek için getNextQuestion fonksiyonunu çağırıyoruz
  setTimeout(() => {
    getNextQuestion();
  }, 1500);
}

// En son yanlış yapılan soruyu seç
function showIncorrectQuestions() {
  if (incorrectQuestions.length > 0) {
    const incorrectQuestion = incorrectQuestions.shift(); // İlk yanlış soruyu al
    currentQuestionIndex = questions.findIndex(q => q.arabic_word === incorrectQuestion); // Yanlış soruyu tekrar göster

    if (currentQuestionIndex !== -1) {
      updateUI();
    } else {
      console.warn("Yanlış soru bulunamadı, kontrol edin:", incorrectQuestion);
    }
  }
}

// Sonraki soruya geçiş yap
function getNextQuestion() {
  if (currentQuestionIndex + 1 >= questions.length) {
    alert(`Test tamamlandı! ${correctAnswers} doğru cevap verdiniz.`);
    saveProgress();
    return;
  }

  currentQuestionIndex++;
  while (completedQuestions.includes(questions[currentQuestionIndex]?.arabic_word)) {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
      alert("Bugünkü tüm soruları tamamladınız!");
      saveProgress();
      return;
    }
  }
  updateUI();
}

// UI'yi güncelle
function updateUI() {
  const questionCount = document.getElementById('question-count');
  const dailyStreakText = document.getElementById('daily-streak');
  const scoreText = document.getElementById('score');
  const questionText = document.getElementById('question-text');
  const questionAudio = document.getElementById('question-audio');
  const options = document.getElementById('options');

  if (currentQuestionIndex >= questions.length) {
    alert(`Bugünkü tüm soruları tamamladınız! Toplam ${correctAnswers} doğru cevap verdiniz.`);
    saveProgress();
    return;
  }

  let question = questions[currentQuestionIndex];

  while (completedQuestions.includes(question.arabic_word)) {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
      alert("Bugünkü tüm soruları tamamladınız!");
      saveProgress();
      return;
    }
    if (currentQuestionIndex < questions.length) {
      question = questions[currentQuestionIndex];
    }
  }

  questionText.textContent = question.arabic_word;
  questionAudio.src = question.sound_url;

  questionAudio.onerror = () => {
    alert("Ses dosyası yüklenemedi.");
  };

  questionAudio.play();

  options.innerHTML = '';

  const shuffledOptions = getRandomOptions(question.turkish_meaning);

  shuffledOptions.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option;
    button.onclick = () => handleAnswerHistory(option === question.turkish_meaning, button);
    options.appendChild(button);
  });

  questionCount.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
  dailyStreakText.textContent = `Günlük Seri: ${dailyStreak}`;
  scoreText.textContent = `Puan: ${correctAnswers}`;
}

// Rastgele doğru ve yanlış seçenekleri karıştır
function getRandomOptions(correctOption) {
  const uniqueOptions = questions
    .map(q => q.turkish_meaning)
    .filter(mean => mean !== correctOption);

  const randomWrongOptions = shuffleArray(uniqueOptions).slice(0, 2);
  return shuffleArray([correctOption, ...randomWrongOptions]);
}

// Diziyi karıştır
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Soruları karıştır
function shuffleQuestions() {
  questions = questions.sort(() => Math.random() - 0.5);
}

// Soruları yükle ve başlat
async function loadQuestions() {
  const response = await fetch('output.json');
  const data = await response.json();

  questions = data
    .filter(item => item.arabic_word && item.turkish_meaning && item.sound_url)
    .map(item => ({
      arabic_word: item.arabic_word,
      turkish_meaning: item.turkish_meaning,
      sound_url: item.sound_url,
    }));

  shuffleQuestions();
  loadProgress();
  updateUI();
}

// Dinamik yükseklik ayarı
const app = document.getElementById('app');

function setAppHeight() {
  app.style.height = `${window.innerHeight}px`;
}

window.addEventListener('resize', setAppHeight);
setAppHeight();

// Sıfırla düğmesi ekleme
const resetButton = document.getElementById('reset-btn');
if (resetButton) {
  resetButton.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
  });
}

document.getElementById('next-btn').addEventListener('click', () => {
  getNextQuestion(); // Sonraki soruya geçiş yap
});

loadQuestions();
