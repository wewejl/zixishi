import { computed, reactive } from 'vue';
import { reservationService } from '../api/services/reservation';
import { studySessionService } from '../api/services/studySession';

const state = reactive({
  currentReservation: null,
  currentSession: null,
  loadingReservation: false,
  loadingSession: false,
  error: null
});

async function fetchCurrentReservation() {
  state.loadingReservation = true;
  state.error = null;

  try {
    const result = await reservationService.getCurrent();
    state.currentReservation = result.reservation || null;
    return result;
  } catch (error) {
    state.error = error;
    throw error;
  } finally {
    state.loadingReservation = false;
  }
}

async function fetchCurrentSession() {
  state.loadingSession = true;
  state.error = null;

  try {
    const result = await studySessionService.getCurrent();
    state.currentSession = result.session || null;
    return result;
  } catch (error) {
    state.error = error;
    throw error;
  } finally {
    state.loadingSession = false;
  }
}

async function refreshCurrent() {
  const [reservation, session] = await Promise.all([
    fetchCurrentReservation(),
    fetchCurrentSession()
  ]);

  return { reservation, session };
}

function clearBookingState() {
  state.currentReservation = null;
  state.currentSession = null;
  state.error = null;
}

export const bookingStore = {
  state,
  currentReservation: computed(() => state.currentReservation),
  currentSession: computed(() => state.currentSession),
  hasCurrentReservation: computed(() => Boolean(state.currentReservation)),
  hasActiveSession: computed(() => Boolean(state.currentSession)),
  fetchCurrentReservation,
  fetchCurrentSession,
  refreshCurrent,
  clearBookingState
};

export default bookingStore;
