import { removeCustomerSocket, setCustomerSocket } from "../services/redis.service.js";

export const configureSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-salon-room", ({ salonId }) => {
      socket.join(`salon:${salonId}`);
    });

    socket.on("leave-salon-room", ({ salonId }) => {
      socket.leave(`salon:${salonId}`);
    });

    socket.on("barber-join", ({ salonId, barberId }) => {
      socket.join(`salon:${salonId}`);
      socket.join(`barber:${barberId}`);
      socket.data.barberId = barberId;
    });

    socket.on("customer-join", async ({ customerId }) => {
      socket.join(`customer:${customerId}`);
      socket.data.customerId = customerId;
      await setCustomerSocket(customerId, socket.id);
    });

    socket.on("disconnect", async () => {
      if (socket.data.customerId) {
        await removeCustomerSocket(socket.data.customerId);
      }
    });
  });
};
