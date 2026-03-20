const SPRITES_BASE_PATH = 'assets/sprites/';

/** Сброс всех отложенных колбэков при смене экрана / выходе (иначе срабатывают «призраки»). */
const gameTimers = new Set();
function scheduleGame(fn, ms) {
  const id = setTimeout(() => {
    gameTimers.delete(id);
    fn();
  }, ms);
  gameTimers.add(id);
  return id;
}
function clearGameTimer(id) {
  if (id != null) {
    clearTimeout(id);
    gameTimers.delete(id);
  }
}
function clearAllGameTimers() {
  gameTimers.forEach((id) => clearTimeout(id));
  gameTimers.clear();
}

function spriteImg(name, alt = '') {
  if (!name) return '';
  return `<img class="sprite sprite-${name}" src="${SPRITES_BASE_PATH}${name}.png" alt="${alt}" loading="lazy">`;
}

function ingredientVisual(step) {
  if (step.sprite) {
    return spriteImg(step.sprite, step.ingredient || '');
  }
  return step.ingredient || '';
}

const RECIPES = {
  omelet: {
    name: 'Омлет',
    icon: 'omelet-plated',
    steps: [
      {
        type: 'chop',
        instruction: 'Нарежь зелень на разделочной доске. Нажимай на зелень!',
        ingredient: 'Зелень',
        sprite: 'herbs-chopped',
        chops: 5
      },
      {
        type: 'mix',
        instruction: 'Взбей яйца в миске! Нажимай на миску.',
        ingredient: 'Яичная смесь',
        sprite: 'egg-mixed',
        stirs: 8
      },
      {
        type: 'pan',
        instruction: 'Вылей смесь на сковороду и дождись готовности...',
        ingredient: 'Омлет',
        sprite: 'omelet-raw',
        wait: 2
      },
      {
        type: 'flip',
        instruction: 'Переверни омлет 3 раза! Нажми кнопку в нужный момент.',
        ingredient: 'Омлет',
        sprite: 'omelet-cooked',
        flipTiming: true,
        flips: 3
      },
      { type: 'done', instruction: 'Готово! Омлет идеален! 🧑‍🍳' }
    ]
  },
  pizza: {
    name: 'Пицца',
    icon: 'pizza-baked',
    steps: [
      {
        type: 'chop',
        instruction: 'Нарежь томаты для соуса!',
        ingredient: 'Помидор',
        sprite: 'tomato-sliced',
        chops: 4
      },
      {
        type: 'spread',
        instruction: 'Раскатай тесто и добавь соус. Выбери лопатку и нажимай на основу!',
        ingredient: 'Основа',
        sprite: 'dough-rolled'
      },
      {
        type: 'toppings',
        instruction: 'Добавь начинку лопаткой — нажми кнопки ниже!',
        toppings: ['cheese', 'mushroom', 'olive', 'basil']
      },
      { type: 'done', instruction: 'Пицца готова к выпечке! 🍕' }
    ]
  },
  salad: {
    name: 'Салат',
    icon: 'salad-mixed',
    steps: [
      {
        type: 'chop',
        instruction: 'Нарежь огурцы!',
        ingredient: 'Огурец',
        sprite: 'cucumber-sliced',
        chops: 4
      },
      {
        type: 'chop',
        instruction: 'Нарежь помидоры!',
        ingredient: 'Помидор',
        sprite: 'tomato-sliced',
        chops: 4
      },
      {
        type: 'mix',
        instruction: 'Смешай овощи в миске!',
        ingredient: 'Салат',
        sprite: 'salad-mixed',
        stirs: 6
      },
      { type: 'done', instruction: 'Салат готов! Приятного аппетита! 🥗' }
    ]
  }
};

let currentRecipe = null;
let currentStep = 0;
let chopCount = 0;
let stirCount = 0;
let flipReady = false;
let flipFailTimer = null;
let doneVictoryTimer = null;
let currentTool = null;

const TOPPING_LABELS = {
  cheese: 'сыр',
  mushroom: 'грибы',
  olive: 'оливки',
  basil: 'базилик'
};

function flashNeedTool() {
  toolPanel?.classList.add('need-tool');
  scheduleGame(() => toolPanel?.classList.remove('need-tool'), 450);
}

function resetToolsSelection() {
  currentTool = null;
  toolPanel?.querySelectorAll('.tool-button').forEach((b) => b.classList.remove('active'));
  updateHandOverlay();
}

const TOOL_CONFIG = {
  knife: { id: 'knife', sprite: 'knife', label: 'Нож', actions: ['chop'] },
  whisk: { id: 'whisk', sprite: 'whisk', label: 'Венчик', actions: ['mix'] },
  spatula: { id: 'spatula', sprite: 'spatula', label: 'Лопатка', actions: ['toppings', 'spread', 'pan', 'flip'] }
};

const recipeScreen = document.getElementById('recipeScreen');
const kitchenView = document.getElementById('kitchenView');
const victoryScreen = document.getElementById('victoryScreen');
const stepInstruction = document.getElementById('stepInstruction');
const minigameArea = document.getElementById('minigameArea');
const recipeNameDisplay = document.getElementById('recipeNameDisplay');
const stepIndicator = document.getElementById('stepIndicator');
const victoryDish = document.getElementById('victoryDish');
const toolPanel = document.getElementById('toolPanel');
const handOverlay = document.getElementById('handOverlay');

function updateHandOverlay() {
  if (!handOverlay) return;

  let spriteName = 'hand-empty';
  if (currentTool === 'knife') spriteName = 'hand-holding-knife';
  else if (currentTool === 'whisk') spriteName = 'hand-holding-whisk';
  else if (currentTool === 'spatula') spriteName = 'hand-holding-spatula';

  handOverlay.innerHTML = spriteImg(spriteName, 'Рука повара');

  if (currentTool) {
    handOverlay.classList.add('visible');
  } else {
    handOverlay.classList.remove('visible');
  }
}

function renderToolPanel() {
  if (!toolPanel) return;
  const tools = Object.values(TOOL_CONFIG);
  toolPanel.innerHTML = `
    <span class="tool-panel-label">Инструменты:</span>
    ${tools.map(tool => `
      <button class="tool-button" data-tool="${tool.id}" aria-label="${tool.label}">
        ${spriteImg(tool.sprite, tool.label)}
      </button>
    `).join('')}
  `;

  toolPanel.querySelectorAll('.tool-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tool;
      if (!TOOL_CONFIG[id]) return;
      currentTool = id;
      toolPanel.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateHandOverlay();
    });
  });
}

function isToolValidFor(action) {
  const tools = Object.values(TOOL_CONFIG);
  const requiredTools = tools.filter(t => t.actions.includes(action));
  if (!requiredTools.length) return true;
  if (!currentTool) return false;
  return !!TOOL_CONFIG[currentTool]?.actions.includes(action);
}

// Выбор рецепта
document.querySelectorAll('.recipe-card').forEach(card => {
  card.addEventListener('click', () => {
    const recipeId = card.dataset.recipe;
    startRecipe(recipeId);
  });
});

document.getElementById('backBtn').addEventListener('click', () => {
  clearAllGameTimers();
  flipFailTimer = null;
  doneVictoryTimer = null;
  resetToolsSelection();
  recipeScreen.style.display = 'block';
  kitchenView.classList.remove('active');
  kitchenView.style.display = 'none';
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  clearAllGameTimers();
  flipFailTimer = null;
  doneVictoryTimer = null;
  resetToolsSelection();
  victoryScreen.classList.remove('active');
  recipeScreen.style.display = 'block';
});

renderToolPanel();

function startRecipe(recipeId) {
  clearAllGameTimers();
  flipFailTimer = null;
  doneVictoryTimer = null;
  currentRecipe = RECIPES[recipeId];
  currentStep = 0;
  chopCount = 0;
  stirCount = 0;
  resetToolsSelection();
  recipeScreen.style.display = 'none';
  kitchenView.style.display = 'block';
  kitchenView.classList.add('active');
  recipeNameDisplay.textContent = currentRecipe.name;
  renderStep();
}

function renderStep() {
  const steps = currentRecipe.steps;
  const step = steps[currentStep];

  // Индикатор шагов
  stepIndicator.innerHTML = steps.map((_, i) =>
    `<span class="step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}"></span>`
  ).join('');

  stepInstruction.textContent = step.instruction;
  minigameArea.innerHTML = '';

  if (step.type === 'done') {
    clearGameTimer(doneVictoryTimer);
    doneVictoryTimer = scheduleGame(() => showVictory(), 800);
    return;
  }

  if (step.type === 'chop') {
    renderChopMinigame(step);
  } else if (step.type === 'mix') {
    renderMixMinigame(step);
  } else if (step.type === 'pan') {
    renderPanMinigame(step);
  } else if (step.type === 'flip') {
    renderFlipMinigame(step);
  } else if (step.type === 'spread') {
    renderSpreadMinigame(step);
  } else if (step.type === 'toppings') {
    renderToppingsMinigame(step);
  }
}

function renderChopMinigame(step) {
  chopCount = 0;
  const chops = step.chops || 5;

  function getWholeSpriteForChop(chopSprite) {
    // Подбираем "целый" спрайт под соответствующий спрайт-резанку
    // (чтобы зелень/томаты/огурцы выглядели реалистично до начала кликов ножом)
    if (chopSprite === 'herbs-chopped') return 'herbs';
    if (chopSprite === 'tomato-sliced') return 'tomato';
    if (chopSprite === 'cucumber-sliced') return 'cucumber-whole';
    return null;
  }

  minigameArea.innerHTML = `
    <div class="chopping-zone">
      <div class="cutting-board" id="cuttingBoard">
        <span class="ingredient-to-chop" id="ingredient"></span>
        <div class="stir-progress">
          <div class="stir-progress-fill" id="chopProgress"></div>
        </div>
      </div>
    </div>
  `;

  const board = document.getElementById('cuttingBoard');
  const ingredient = document.getElementById('ingredient');
  const progressFill = document.getElementById('chopProgress');

  const wholeSprite = getWholeSpriteForChop(step.sprite);
  ingredient.innerHTML = wholeSprite ? spriteImg(wholeSprite, step.ingredient || '') : ingredientVisual(step);

  ingredient.addEventListener('click', () => {
    if (chopCount >= chops) return;
    if (!isToolValidFor('chop')) {
      flashNeedTool();
      return;
    }
    chopCount++;

    // На первом корректном клике ножом показываем "резаную" версию
    if (chopCount === 1 && step.sprite) {
      ingredient.innerHTML = spriteImg(step.sprite, step.ingredient || '');
    }

    board?.classList.remove('board-chop');
    void board?.offsetWidth;
    board?.classList.add('board-chop');

    const progress = Math.min((chopCount / chops) * 100, 100);
    progressFill.style.width = `${progress}%`;
    ingredient.style.transform = `translate(-50%, -50%) scale(${1 - Math.min(chopCount, chops) * 0.05})`;
    if (chopCount >= chops) {
      ingredient.style.pointerEvents = 'none';
      scheduleGame(() => nextStep(), 500);
    }
  });
}

function renderMixMinigame(step) {
  stirCount = 0;
  const stirs = step.stirs || 6;

  minigameArea.innerHTML = `
    <div class="mixing-zone">
      <div class="bowl" id="mixBowl">
        <span class="bowl-content">${ingredientVisual(step)}</span>
      </div>
      <div class="stir-progress">
        <div class="stir-progress-fill" id="stirProgress"></div>
      </div>
    </div>
  `;

  const bowl = document.getElementById('mixBowl');
  const progressFill = document.getElementById('stirProgress');

  bowl.addEventListener('click', () => {
    if (stirCount >= stirs) return;
    if (!isToolValidFor('mix')) {
      flashNeedTool();
      return;
    }
    stirCount++;
    progressFill.style.width = `${(stirCount / stirs) * 100}%`;
    const content = bowl.querySelector('.bowl-content');
    const direction = stirCount % 2 === 0 ? 1 : -1;
    content.style.transform = `translateX(-50%) scaleX(${direction})`;
    bowl.classList.remove('bowl-stir');
    void bowl.offsetWidth;
    bowl.classList.add('bowl-stir');
    if (stirCount >= stirs) {
      bowl.style.pointerEvents = 'none';
      scheduleGame(() => nextStep(), 400);
    }
  });
}

function renderPanMinigame(step) {
  minigameArea.innerHTML = `
    <div class="pan-zone">
      <div class="pan">
        <div class="pan-food">
          ${step.sprite ? spriteImg(step.sprite, step.ingredient || '') : ''}
        </div>
        ${spriteImg('sizzle-effect', 'Шипение')}
      </div>
    </div>
  `;

  const wait = (step.wait || 2) * 1000;
  const panEl = minigameArea.querySelector('.pan');
  panEl?.classList.add('pan-heating');
  scheduleGame(() => {
    panEl?.classList.remove('pan-heating');
    nextStep();
  }, wait);
}

function renderFlipMinigame(step) {
  flipReady = false;
  clearGameTimer(flipFailTimer);
  flipFailTimer = null;

  const flipsNeeded = step.flips || 3;
  let flipsDone = 0;

  // Сырой омлет до финального переворота, затем показываем "готовый".
  const rawSprite = step.sprite === 'omelet-cooked' ? 'omelet-raw' : step.sprite;
  const rawMarkup = step.sprite ? spriteImg(rawSprite, step.ingredient || '') : '';
  const cookedMarkup = step.sprite ? spriteImg(step.sprite, step.ingredient || '') : '';

  minigameArea.innerHTML = `
    <div class="pan-zone">
      <div class="pan" id="flipPan">
        <div class="pan-food">
          <div class="omelet-food" id="omeletFood">
            ${rawMarkup}
          </div>
        </div>
        ${spriteImg('sizzle-effect', 'Шипение')}
      </div>
      <button type="button" class="flip-btn" id="flipBtn" disabled>Перевернуть!</button>
    </div>
  `;

  const flipBtn = document.getElementById('flipBtn');
  const flipPan = document.getElementById('flipPan');
  const omeletFood = document.getElementById('omeletFood');

  let flipInProgress = false;

  function openFlipWindow() {
    if (!flipBtn || !document.body.contains(flipBtn)) return;
    if (flipsDone >= flipsNeeded) return;

    flipInProgress = false;
    flipReady = true;
    flipBtn.disabled = false;
    flipBtn.textContent = 'Перевернуть СЕЙЧАС!';
    flipBtn.classList.add('flip-window-open');

    clearGameTimer(flipFailTimer);
    flipFailTimer = scheduleGame(() => {
      flipReady = false;
      flipBtn.disabled = true;
      flipBtn.classList.remove('flip-window-open');
      flipBtn.textContent = 'Упустил момент! Попробуй снова...';
      flipFailTimer = null;
      scheduleGame(() => renderStep(), 1500);
    }, 1500);
  }

  function triggerOmeletFlip(isFinal) {
    if (flipPan) {
      flipPan.classList.remove('pan-flip-success');
      void flipPan.offsetWidth; // restart animation
      flipPan.classList.add('pan-flip-success');
    }

    if (!omeletFood) return;
    omeletFood.classList.remove('omelet-flip-success');
    void omeletFood.offsetWidth; // restart animation
    omeletFood.classList.add('omelet-flip-success');

    if (isFinal) {
      scheduleGame(() => {
        if (!minigameArea.contains(omeletFood)) return;
        omeletFood.innerHTML = cookedMarkup;
      }, 320);
    } else {
      // Оставляем омлет "сырым" до финального переворота.
      // Спрайт не перерисовываем, чтобы анимация не моргала.
    }
  }

  scheduleGame(() => openFlipWindow(), 1800);

  flipBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isToolValidFor('flip')) {
      flashNeedTool();
      return;
    }
    if (!flipReady || flipBtn.disabled || flipInProgress) return;

    flipInProgress = true;
    clearGameTimer(flipFailTimer);
    flipFailTimer = null;

    flipReady = false;
    flipBtn.disabled = true;
    flipBtn.classList.remove('flip-window-open');
    flipBtn.textContent = 'Идеально! ✨';

    flipsDone++;
    const isFinal = flipsDone >= flipsNeeded;
    triggerOmeletFlip(isFinal);

    if (isFinal) {
      scheduleGame(() => nextStep(), 680);
    } else {
      scheduleGame(() => openFlipWindow(), 900);
    }
  });
}

function renderSpreadMinigame(step) {
  let clicks = 0;
  const needed = 5;

  minigameArea.innerHTML = `
    <div class="pizza-zone">
      <div class="pizza-dough" id="pizzaDough">
        <span class="pizza-dough-inner">
          ${ingredientVisual(step)}
        </span>
      </div>
      <div class="stir-progress spread-progress">
        <div class="stir-progress-fill" id="spreadProgress"></div>
      </div>
    </div>
  `;

  const dough = document.getElementById('pizzaDough');
  const spreadProgress = document.getElementById('spreadProgress');

  dough.addEventListener('click', () => {
    if (clicks >= needed) return;
    if (!isToolValidFor('spread')) {
      flashNeedTool();
      return;
    }
    clicks++;
    spreadProgress.style.width = `${(clicks / needed) * 100}%`;
    dough.classList.remove('dough-tap');
    void dough.offsetWidth;
    dough.classList.add('dough-tap');
    if (clicks >= needed) {
      dough.style.pointerEvents = 'none';
      scheduleGame(() => nextStep(), 450);
    }
  });
}

function renderToppingsMinigame(step) {
  const toppings = step.toppings || ['cheese', 'mushroom'];
  let added = 0;
  const needed = toppings.length;

  minigameArea.innerHTML = `
    <div class="pizza-zone">
      <div class="pizza-dough" id="pizzaBase">
        <div class="pizza-toppings" id="toppingsContainer"></div>
      </div>
      <div class="toppings-row">
        ${toppings.map((t) => `<button type="button" class="add-topping-btn" data-topping="${t}">+ ${TOPPING_LABELS[t] || t}</button>`).join('')}
      </div>
    </div>
  `;

  const container = document.getElementById('toppingsContainer');

  minigameArea.querySelectorAll('.add-topping-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || added >= needed) return;
      if (!isToolValidFor('toppings')) {
        flashNeedTool();
        return;
      }
      const topping = btn.dataset.topping;
      const wrapper = document.createElement('span');
      wrapper.className = 'topping topping-pop';
      wrapper.innerHTML = spriteImg(topping, TOPPING_LABELS[topping] || topping);
      wrapper.style.left = `${22 + Math.random() * 56}%`;
      wrapper.style.top = `${22 + Math.random() * 56}%`;
      wrapper.style.setProperty('--t-rot', `${(Math.random() * 56 - 28).toFixed(1)}deg`);
      container.appendChild(wrapper);
      btn.disabled = true;
      btn.classList.add('topping-used');
      added++;
      if (added >= needed) scheduleGame(() => nextStep(), 500);
    });
  });
}

function nextStep() {
  currentStep++;
  renderStep();
}

function showVictory() {
  if (!currentRecipe) return;
  clearGameTimer(doneVictoryTimer);
  doneVictoryTimer = null;
  kitchenView.style.display = 'none';
  kitchenView.classList.remove('active');
  victoryScreen.classList.add('active');
  victoryDish.innerHTML = spriteImg(currentRecipe.icon, currentRecipe.name);
}
