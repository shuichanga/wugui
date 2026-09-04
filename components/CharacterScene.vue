<template>
  <section class="relative h-full overflow-hidden bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600">
    <!-- Brand -->
    <div class="relative z-20 p-12">
      <span class="flex items-center gap-2 text-lg font-semibold text-white">
        <Package :size="28" aria-hidden="true" />
        <span>物归</span>
      </span>
    </div>

    <!-- Character Scene -->
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="scene-wrapper">
        <div class="scene-inner">
          <div ref="purpleCharacter" class="character char-purple">
            <div ref="purpleEyes" class="eye-row char-purple-eyes">
              <div ref="purpleEye1" class="eye-ball eye-purple"><div ref="purplePupil1" class="pupil pupil-purple"></div></div>
              <div ref="purpleEye2" class="eye-ball eye-purple"><div ref="purplePupil2" class="pupil pupil-purple"></div></div>
            </div>
          </div>
          <div ref="blackCharacter" class="character char-black">
            <div ref="blackEyes" class="eye-row char-black-eyes">
              <div ref="blackEye1" class="eye-ball eye-black"><div ref="blackPupil1" class="pupil pupil-black"></div></div>
              <div ref="blackEye2" class="eye-ball eye-black"><div ref="blackPupil2" class="pupil pupil-black"></div></div>
            </div>
          </div>
          <div ref="orangeCharacter" class="character char-orange">
            <div ref="orangeEyes" class="eye-row char-orange-eyes">
              <div ref="orangePupil1" class="pupil pupil-front"></div>
              <div ref="orangePupil2" class="pupil pupil-front"></div>
            </div>
          </div>
          <div ref="yellowCharacter" class="character char-yellow">
            <div ref="yellowEyes" class="eye-row char-yellow-eyes">
              <div ref="yellowPupil1" class="pupil pupil-front"></div>
              <div ref="yellowPupil2" class="pupil pupil-front"></div>
            </div>
            <div ref="yellowMouth" class="char-yellow-mouth"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Background Effects -->
    <div class="absolute inset-0 bg-grid"></div>
    <div class="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-gray-400/20 blur-3xl"></div>
    <div class="absolute bottom-1/4 left-1/4 h-96 w-96 rounded-full bg-gray-300/20 blur-3xl"></div>
  </section>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'

const props = defineProps<{
  isTyping: boolean
  passwordLength: number
  showPassword: boolean
}>()

const purpleCharacter = ref<HTMLElement | null>(null)
const blackCharacter = ref<HTMLElement | null>(null)
const orangeCharacter = ref<HTMLElement | null>(null)
const yellowCharacter = ref<HTMLElement | null>(null)
const purpleEyes = ref<HTMLElement | null>(null)
const blackEyes = ref<HTMLElement | null>(null)
const orangeEyes = ref<HTMLElement | null>(null)
const yellowEyes = ref<HTMLElement | null>(null)
const yellowMouth = ref<HTMLElement | null>(null)
const purpleEye1 = ref<HTMLElement | null>(null)
const purpleEye2 = ref<HTMLElement | null>(null)
const blackEye1 = ref<HTMLElement | null>(null)
const blackEye2 = ref<HTMLElement | null>(null)
const purplePupil1 = ref<HTMLElement | null>(null)
const purplePupil2 = ref<HTMLElement | null>(null)
const blackPupil1 = ref<HTMLElement | null>(null)
const blackPupil2 = ref<HTMLElement | null>(null)
const orangePupil1 = ref<HTMLElement | null>(null)
const orangePupil2 = ref<HTMLElement | null>(null)
const yellowPupil1 = ref<HTMLElement | null>(null)
const yellowPupil2 = ref<HTMLElement | null>(null)

const state = {
  mouseX: 0,
  mouseY: 0,
  isTyping: false,
  showPassword: false,
  passwordLength: 0,
  isPurpleBlinking: false,
  isBlackBlinking: false,
  isLookingAtEachOther: false,
  isPurplePeeking: false,
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const setT = (el: HTMLElement, x: number, y: number) => { el.style.transform = `translate(${x}px,${y}px)` }
const setEye = (eye: HTMLElement, pupil: HTMLElement, size: number, isBlinking: boolean) => {
  eye.style.height = isBlinking ? '2px' : `${size}px`
  pupil.style.display = isBlinking ? 'none' : 'block'
}

function pupilPos(el: HTMLElement, maxD: number, fx?: number, fy?: number) {
  if (fx !== undefined && fy !== undefined) return { x: fx, y: fy }
  const r = el.getBoundingClientRect()
  const dx = state.mouseX - (r.left + r.width / 2)
  const dy = state.mouseY - (r.top + r.height / 2)
  const dist = Math.min(Math.hypot(dx, dy), maxD)
  const a = Math.atan2(dy, dx)
  return { x: Math.cos(a) * dist, y: Math.sin(a) * dist }
}

function charPos(el: HTMLElement | null) {
  if (!el) return { faceX: 0, faceY: 0, bodySkew: 0 }
  const r = el.getBoundingClientRect()
  const dx = state.mouseX - (r.left + r.width / 2)
  const dy = state.mouseY - (r.top + r.height / 3)
  return { faceX: clamp(dx / 20, -15, 15), faceY: clamp(dy / 30, -10, 10), bodySkew: clamp(-dx / 120, -6, 6) }
}

function render() {
  const pp = charPos(purpleCharacter.value)
  const bp = charPos(blackCharacter.value)
  const op = charPos(orangeCharacter.value)
  const yp = charPos(yellowCharacter.value)
  const hiding = state.passwordLength > 0 && !state.showPassword
  const reveal = state.passwordLength > 0 && state.showPassword

  const pC = purpleCharacter.value, bC = blackCharacter.value, oC = orangeCharacter.value, yC = yellowCharacter.value
  if (pC) {
    pC.style.height = (state.isTyping || hiding) ? '380px' : '340px'
    pC.style.transform = reveal ? 'skewX(0deg)' : (state.isTyping || hiding) ? `skewX(${(pp.bodySkew || 0) - 12}deg) translateX(35px)` : `skewX(${pp.bodySkew || 0}deg)`
  }
  if (bC) {
    bC.style.transform = reveal ? 'skewX(0deg)' : state.isLookingAtEachOther ? `skewX(${(bp.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)` : (state.isTyping || hiding) ? `skewX(${(bp.bodySkew || 0) * 1.5}deg)` : `skewX(${bp.bodySkew || 0}deg)`
  }
  if (oC) oC.style.transform = reveal ? 'skewX(0deg)' : `skewX(${op.bodySkew || 0}deg)`
  if (yC) yC.style.transform = reveal ? 'skewX(0deg)' : `skewX(${yp.bodySkew || 0}deg)`

  const pE = purpleEyes.value, bE = blackEyes.value, oE = orangeEyes.value, yE = yellowEyes.value, yM = yellowMouth.value
  if (pE) {
    pE.style.left = reveal ? '18px' : state.isLookingAtEachOther ? '50px' : `${40 + pp.faceX}px`
    pE.style.top = reveal ? '30px' : state.isLookingAtEachOther ? '58px' : `${34 + pp.faceY}px`
  }
  if (bE) {
    bE.style.left = reveal ? '9px' : state.isLookingAtEachOther ? '28px' : `${23 + bp.faceX}px`
    bE.style.top = reveal ? '25px' : state.isLookingAtEachOther ? '10px' : `${28 + bp.faceY}px`
  }
  if (oE) {
    oE.style.left = reveal ? '45px' : `${73 + (op.faceX || 0)}px`
    oE.style.top = reveal ? '75px' : `${78 + (op.faceY || 0)}px`
  }
  if (yE) {
    yE.style.left = reveal ? '18px' : `${46 + (yp.faceX || 0)}px`
    yE.style.top = reveal ? '32px' : `${36 + (yp.faceY || 0)}px`
  }
  if (yM) {
    yM.style.left = reveal ? '8px' : `${36 + (yp.faceX || 0)}px`
    yM.style.top = reveal ? '76px' : `${76 + (yp.faceY || 0)}px`
  }

  const pfX = reveal ? (state.isPurplePeeking ? 3 : -3) : state.isLookingAtEachOther ? 2 : undefined
  const pfY = reveal ? (state.isPurplePeeking ? 4 : -3) : state.isLookingAtEachOther ? 3 : undefined
  const bfX = reveal ? -3 : state.isLookingAtEachOther ? 0 : undefined
  const bfY = reveal ? -3 : state.isLookingAtEachOther ? -3 : undefined
  const ffX = reveal ? -4 : undefined
  const ffY = reveal ? -3 : undefined

  const p1 = purpleEye1.value, p2 = purpleEye2.value, pP1 = purplePupil1.value, pP2 = purplePupil2.value
  const b1 = blackEye1.value, b2 = blackEye2.value, bP1 = blackPupil1.value, bP2 = blackPupil2.value
  const oP1 = orangePupil1.value, oP2 = orangePupil2.value, yP1 = yellowPupil1.value, yP2 = yellowPupil2.value

  if (p1 && pP1) { setEye(p1, pP1, 16, state.isPurpleBlinking); const p = pupilPos(p1, 4.5, pfX, pfY); setT(pP1, p.x, p.y) }
  if (p2 && pP2) { setEye(p2, pP2, 16, state.isPurpleBlinking); const p = pupilPos(p2, 4.5, pfX, pfY); setT(pP2, p.x, p.y) }
  if (b1 && bP1) { setEye(b1, bP1, 14, state.isBlackBlinking); const p = pupilPos(b1, 3.5, bfX, bfY); setT(bP1, p.x, p.y) }
  if (b2 && bP2) { setEye(b2, bP2, 14, state.isBlackBlinking); const p = pupilPos(b2, 3.5, bfX, bfY); setT(bP2, p.x, p.y) }
  if (oP1) { const p = pupilPos(oP1, 5, ffX, ffY); setT(oP1, p.x, p.y) }
  if (oP2) { const p = pupilPos(oP2, 5, ffX, ffY); setT(oP2, p.x, p.y) }
  if (yP1) { const p = pupilPos(yP1, 5, ffX, ffY); setT(yP1, p.x, p.y) }
  if (yP2) { const p = pupilPos(yP2, 5, ffX, ffY); setT(yP2, p.x, p.y) }
}

function scheduleBlink(key: 'isPurpleBlinking' | 'isBlackBlinking') {
  setTimeout(() => {
    state[key] = true
    render()
    setTimeout(() => { state[key] = false; render(); scheduleBlink(key) }, 150)
  }, Math.random() * 4000 + 3000)
}

let lookTimer: ReturnType<typeof setTimeout> | null = null
let peekTimer: ReturnType<typeof setTimeout> | null = null
let peekResetTimer: ReturnType<typeof setTimeout> | null = null

function triggerLook() {
  state.isLookingAtEachOther = true
  render()
  if (lookTimer) clearTimeout(lookTimer)
  lookTimer = setTimeout(() => { state.isLookingAtEachOther = false; render() }, 800)
}

function schedulePeek() {
  if (peekTimer) clearTimeout(peekTimer)
  if (peekResetTimer) clearTimeout(peekResetTimer)
  if (state.passwordLength > 0 && state.showPassword) {
    peekTimer = setTimeout(() => {
      state.isPurplePeeking = true
      render()
      peekResetTimer = setTimeout(() => { state.isPurplePeeking = false; render(); schedulePeek() }, 800)
    }, Math.random() * 3000 + 2000)
  } else { state.isPurplePeeking = false; render() }
}

onMounted(() => {
  state.mouseX = window.innerWidth / 2
  state.mouseY = window.innerHeight / 2
  const onPointer = (e: { clientX: number; clientY: number }) => { state.mouseX = e.clientX; state.mouseY = e.clientY; render() }
  window.addEventListener('mousemove', onPointer)
  window.addEventListener('touchmove', onPointer, { passive: true })
  scheduleBlink('isPurpleBlinking')
  scheduleBlink('isBlackBlinking')
  render()
})

watch(() => props.isTyping, (v) => { state.isTyping = v; if (v) triggerLook(); render() })
watch(() => props.passwordLength, (v) => { state.passwordLength = v; schedulePeek(); render() })
watch(() => props.showPassword, (v) => { state.showPassword = v; schedulePeek(); render() })
</script>

<style scoped>
.bg-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}

.scene-wrapper { position: relative; width: 500px; height: 340px; display: flex; align-items: center; justify-content: center; }
.scene-inner { position: relative; width: 500px; height: 340px; }

.character { position: absolute; bottom: 0; border-radius: 10px 10px 0 0; transition: all 300ms ease-in-out; transform-origin: bottom center; will-change: transform; }
.char-purple { left: 60px; width: 160px; height: 340px; background: #6C3FF5; z-index: 1; }
.char-black { left: 210px; width: 105px; height: 265px; background: #2D2D2D; z-index: 2; }
.char-orange { left: 0; width: 210px; height: 170px; background: #FF9B6B; border-radius: 105px 105px 0 0; z-index: 3; }
.char-yellow { left: 270px; width: 125px; height: 200px; background: #E8D754; border-radius: 62px 62px 0 0; z-index: 4; }

.eye-row { position: absolute; display: flex; align-items: center; transition: all 300ms ease-in-out; }
.char-purple-eyes { gap: 22px; left: 40px; top: 34px; }
.char-black-eyes { gap: 20px; left: 23px; top: 28px; }
.char-orange-eyes { gap: 41px; left: 73px; top: 78px; transition: all 200ms ease-out; }
.char-yellow-eyes { gap: 41px; left: 46px; top: 36px; transition: all 200ms ease-out; }

.eye-ball { display: flex; align-items: center; justify-content: center; border-radius: 9999px; overflow: hidden; transition: all 150ms; }
.eye-purple { width: 16px; height: 16px; background: white; }
.eye-black { width: 14px; height: 14px; background: white; }

.pupil { border-radius: 9999px; transition: transform 100ms ease-out; }
.pupil-purple { width: 6px; height: 6px; background: #2D2D2D; }
.pupil-black { width: 5px; height: 5px; background: #2D2D2D; }
.pupil-front { width: 11px; height: 11px; background: #2D2D2D; }

.char-yellow-mouth { position: absolute; width: 48px; height: 4px; background: #2D2D2D; border-radius: 9999px; left: 36px; top: 76px; transition: all 200ms ease-out; }
</style>
