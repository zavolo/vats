<template>
  <div ref="cursorOuter" class="cursor-fx cursor-fx-outer" :class="{ active: isActive, hover: isHover, visible: isVisible }"></div>
  <div ref="cursorInner" class="cursor-fx cursor-fx-inner" :class="{ active: isActive, hover: isHover, visible: isVisible }"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  color: {
    type: String,
    default: '#67c23a'
  },
  outerSize: {
    type: Number,
    default: 40
  },
  innerSize: {
    type: Number,
    default: 8
  },
  hoverTargets: {
    type: String,
    default: 'a, button, .el-button, [role="button"], input, textarea, select, .clickable'
  }
})

const cursorOuter = ref(null)
const cursorInner = ref(null)
const isActive = ref(false)
const isHover = ref(false)
const isVisible = ref(false)

let mouseX = -100
let mouseY = -100
let outerX = -100
let outerY = -100
let animationFrame = null

const lerp = (start, end, factor) => start + (end - start) * factor

const animate = () => {
  outerX = lerp(outerX, mouseX, 0.15)
  outerY = lerp(outerY, mouseY, 0.15)

  if (cursorOuter.value) {
    cursorOuter.value.style.transform = `translate(${outerX - props.outerSize / 2}px, ${outerY - props.outerSize / 2}px)`
  }

  if (cursorInner.value) {
    cursorInner.value.style.transform = `translate(${mouseX - props.innerSize / 2}px, ${mouseY - props.innerSize / 2}px)`
  }

  animationFrame = requestAnimationFrame(animate)
}

const onMouseMove = (e) => {
  if (!isVisible.value) {
    isVisible.value = true
  }
  mouseX = e.clientX
  mouseY = e.clientY
}

const onMouseDown = () => {
  isActive.value = true
}

const onMouseUp = () => {
  isActive.value = false
}

const onMouseEnterHover = () => {
  isHover.value = true
}

const onMouseLeaveHover = () => {
  isHover.value = false
}

const addHoverListeners = () => {
  const elements = document.querySelectorAll(props.hoverTargets)
  elements.forEach(el => {
    el.addEventListener('mouseenter', onMouseEnterHover)
    el.addEventListener('mouseleave', onMouseLeaveHover)
  })
}

const removeHoverListeners = () => {
  const elements = document.querySelectorAll(props.hoverTargets)
  elements.forEach(el => {
    el.removeEventListener('mouseenter', onMouseEnterHover)
    el.removeEventListener('mouseleave', onMouseLeaveHover)
  })
}

// MutationObserver для отслеживания новых элементов
let observer = null

onMounted(() => {
  // Проверяем, есть ли touch устройство
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    return // Не показываем кастомный курсор на touch устройствах
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mouseup', onMouseUp)

  // Применяем CSS переменные
  if (cursorOuter.value) {
    cursorOuter.value.style.setProperty('--cursor-color', props.color)
    cursorOuter.value.style.setProperty('--outer-size', `${props.outerSize}px`)
  }
  if (cursorInner.value) {
    cursorInner.value.style.setProperty('--cursor-color', props.color)
    cursorInner.value.style.setProperty('--inner-size', `${props.innerSize}px`)
  }

  addHoverListeners()
  animate()

  // Наблюдаем за изменениями DOM для добавления hover listeners к новым элементам
  observer = new MutationObserver(() => {
    removeHoverListeners()
    addHoverListeners()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mousedown', onMouseDown)
  document.removeEventListener('mouseup', onMouseUp)
  removeHoverListeners()

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }

  if (observer) {
    observer.disconnect()
  }
})
</script>

<style>
/* Скрываем стандартный курсор на всём сайте когда CursorFx активен */
.cursor-fx-enabled,
.cursor-fx-enabled * {
  cursor: none !important;
}

.cursor-fx {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 99999;
  border-radius: 50%;
  will-change: transform;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cursor-fx.visible {
  opacity: 1;
}

.cursor-fx-outer {
  width: var(--outer-size, 40px);
  height: var(--outer-size, 40px);
  border: 2px solid var(--cursor-color, #67c23a);
  transition: width 0.3s ease, height 0.3s ease, border-color 0.3s ease;
}

.cursor-fx-outer.visible {
  opacity: 0.5;
}

.cursor-fx-outer.hover {
  width: calc(var(--outer-size, 40px) * 1.5);
  height: calc(var(--outer-size, 40px) * 1.5);
  opacity: 0.3;
  border-color: var(--el-color-success, #67c23a);
}

.cursor-fx-outer.active {
  width: calc(var(--outer-size, 40px) * 0.8);
  height: calc(var(--outer-size, 40px) * 0.8);
  opacity: 0.8;
}

.cursor-fx-inner {
  width: var(--inner-size, 8px);
  height: var(--inner-size, 8px);
  background: var(--cursor-color, #67c23a);
  transition: transform 0.1s ease, background-color 0.3s ease, width 0.2s ease, height 0.2s ease;
}

.cursor-fx-inner.hover {
  background-color: var(--el-color-success, #67c23a);
  width: calc(var(--inner-size, 8px) * 1.5);
  height: calc(var(--inner-size, 8px) * 1.5);
}

.cursor-fx-inner.active {
  transform: scale(0.8);
}

/* Для тёмной темы */
@media (prefers-color-scheme: dark) {
  .cursor-fx-outer {
    opacity: 0.6;
  }
}
</style>