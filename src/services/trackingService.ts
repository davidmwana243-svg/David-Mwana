import { parseDRCOnlineAddress, DRCAddressDetails } from './orderService';

export const getDeliveryCoordinates = (addressString: string): DRCAddressDetails => {
  return parseDRCOnlineAddress(addressString);
};

export const getOrderStatusStep = (status: string): number => {
  switch (status) {
    case 'payment_pending':
      return 0;
    case 'pending':
      return 1;
    case 'processing':
      return 2;
    case 'shipped':
      return 3;
    case 'delivered':
      return 4;
    default:
      return 0;
  }
};
