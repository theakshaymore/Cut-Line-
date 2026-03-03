export const calcWaitTime = ({ waitingCount, activeChairs, avgTime }) => {
  if (activeChairs === 0) {
    return waitingCount * avgTime;
  }
  return Math.ceil(waitingCount / activeChairs) * avgTime;
};
