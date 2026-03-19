const SPRITES_BASE_PATH = 'assets/sprites/';

function spriteImg(name, alt = '') {
  if (!name) return '';
  return `<img class="sprite sprite-${name}" src="${SPRITES_BASE_PATH}${name}.png" alt="${alt}">`;
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
        instruction: 'Переверни омлет! Нажми кнопку в нужный момент.',
        ingredient: 'Омлет',
        sprite: 'omelet-cooked',
        flipTiming: true
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
        instruction: 'Раскатай тесто и добавь соус. Нажимай на основу!',
        ingredient: 'Основа',
        sprite: 'dough-rolled'
      },
      {
        type: 'toppings',
        instruction: 'Добавь начинку на пиццу!',
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
let flipTimeout = null;
let currentTool = null;

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
  recipeScreen.style.display = 'block';
  kitchenView.classList.remove('active');
  kitchenView.style.display = 'none';
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  victoryScreen.classList.remove('active');
  recipeScreen.style.display = 'block';
});

renderToolPanel();

function startRecipe(recipeId) {
  currentRecipe = RECIPES[recipeId];
  currentStep = 0;
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
    setTimeout(() => showVictory(), 800);
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

  const ingredient = document.getElementById('ingredient');
  const progressFill = document.getElementById('chopProgress');

  const wholeSprite = getWholeSpriteForChop(step.sprite);
  ingredient.innerHTML = wholeSprite ? spriteImg(wholeSprite, step.ingredient || '') : ingredientVisual(step);

  ingredient.addEventListener('click', () => {
    if (!isToolValidFor('chop')) return;
    chopCount++;

    // На первом корректном клике ножом показываем "резаную" версию
    if (chopCount === 1 && step.sprite) {
      ingredient.innerHTML = spriteImg(step.sprite, step.ingredient || '');
    }

    const progress = Math.min((chopCount / chops) * 100, 100);
    progressFill.style.width = `${progress}%`;
    ingredient.style.transform = `translate(-50%, -50%) scale(${1 - Math.min(chopCount, chops) * 0.05})`;
    if (chopCount >= chops) {
      setTimeout(() => nextStep(), 500);
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
    if (!isToolValidFor('mix')) return;
    stirCount++;
    progressFill.style.width = `${(stirCount / stirs) * 100}%`;
    const content = bowl.querySelector('.bowl-content');
    const direction = stirCount % 2 === 0 ? 1 : -1;
    content.style.transform = `translateX(-50%) scaleX(${direction})`;
    if (stirCount >= stirs) {
      setTimeout(() => nextStep(), 400);
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
  setTimeout(() => nextStep(), wait);
}

function renderFlipMinigame(step) {
  flipReady = false;
  minigameArea.innerHTML = `
    <div class="pan-zone">
      <div class="pan">
        <div class="pan-food">
          ${step.sprite ? spriteImg(step.sprite, step.ingredient || '') : ''}
        </div>
      </div>
      <button class="flip-btn" id="flipBtn" disabled>Перевернуть!</button>
    </div>
  `;

  const flipBtn = document.getElementById('flipBtn');

  // Через 1.8 сек кнопка становится активной на 1.5 сек (удобнее на мобильном)
  setTimeout(() => {
    flipReady = true;
    flipBtn.disabled = false;
    flipBtn.textContent = 'Перевернуть СЕЙЧАС!';
    flipTimeout = setTimeout(() => {
      flipReady = false;
      flipBtn.disabled = true;
      flipBtn.textContent = 'Упустил момент! Попробуй снова...';
      setTimeout(() => renderStep(), 1500);
    }, 1500);
  }, 1800);

  flipBtn.addEventListener('click', () => {
    if (!isToolValidFor('flip')) return;
    if (flipReady) {
      clearTimeout(flipTimeout);
      flipBtn.textContent = 'Идеально! ✨';
      setTimeout(() => nextStep(), 600);
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
    </div>
  `;

  document.getElementById('pizzaDough').addEventListener('click', () => {
    clicks++;
    if (clicks >= needed) nextStep();
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
        ${toppings.map((t) => `<button class="add-topping-btn" data-topping="${t}">Добавить ${t}</button>`).join('')}
      </div>
    </div>
  `;

  const container = document.getElementById('toppingsContainer');

  minigameArea.querySelectorAll('.add-topping-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const topping = btn.dataset.topping;
      const wrapper = document.createElement('span');
      wrapper.className = 'topping';
      wrapper.innerHTML = spriteImg(topping, topping);
      wrapper.style.left = `${20 + Math.random() * 60}%`;
      wrapper.style.top = `${20 + Math.random() * 60}%`;
      container.appendChild(wrapper);
      btn.disabled = true;
      btn.style.opacity = '0.5';
      added++;
      if (added >= needed) setTimeout(() => nextStep(), 500);
    });
  });
}

function nextStep() {
  currentStep++;
  renderStep();
}

function showVictory() {
  kitchenView.style.display = 'none';
  victoryScreen.classList.add('active');
  victoryDish.innerHTML = spriteImg(currentRecipe.icon, currentRecipe.name);
}
