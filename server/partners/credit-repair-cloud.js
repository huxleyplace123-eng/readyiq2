// Level 2, registered, not implemented. See partners/registry.js `blockedOn`.
import { getPartner } from './registry.js';

export class PartnerNotAvailable extends Error {
  constructor(id) {
    const def = getPartner(id);
    super(`the ${id} adapter is not implemented yet — blocked on: ${def.blockedOn}`);
    this.name = 'PartnerNotAvailable';
    this.partnerId = id;
    this.blockedOn = def.blockedOn;
    this.workaround = 'zapier';
  }
}

export function fromCreditRepairCloud() { throw new PartnerNotAvailable('credit_repair_cloud'); }
