import React from 'react';
import { monetization } from '@/config/monetization';

interface PricingModalType extends React.FC {
  show?: () => void;
}

const PricingModal: PricingModalType = () => {
  return null;
};

PricingModal.show = () => {
  alert(
    `Pricing:\nFree – up to 3 files per batch, ads shown.\nPro – $${monetization.proPlan.priceMonthly}/month or $${monetization.proPlan.priceLifetime} lifetime.\n\nVisit ${monetization.stripeLink} to subscribe.`
  );
};

export default PricingModal;

