import type { SlotType } from "../../../../shared/contracts";
import { ConflictError, NotFoundError } from "../errors";
import { serviceRepository } from "../repositories/serviceRepository";
import { toServiceItem } from "./mappers";

export const serviceCatalogService = {
  async listServices(options?: { includeInactive?: boolean }) {
    const services = options?.includeInactive
      ? await serviceRepository.listAll()
      : await serviceRepository.listActive();
    return services.map(toServiceItem);
  },

  async createService(input: {
    name: string;
    description: string;
    category: SlotType;
    priceCents: number;
    active: boolean;
  }) {
    try {
      const service = await serviceRepository.create(input);
      return toServiceItem(service);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictError("A service with that name already exists.");
      }

      throw error;
    }
  },

  async updateService(
    id: string,
    input: {
      name: string;
      description: string;
      category: SlotType;
      priceCents: number;
      active: boolean;
    },
  ) {
    try {
      const service = await serviceRepository.update(id, input);
      if (!service) {
        throw new NotFoundError("Service not found.");
      }

      return toServiceItem(service);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictError("A service with that name already exists.");
      }

      throw error;
    }
  },
};
