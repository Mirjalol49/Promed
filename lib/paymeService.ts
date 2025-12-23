/**
 * Payme Service
 * Handles integration with Payme.uz checkout system
 */

// These should ideally be in env variables, but we'll use placeholders for implementation
const PAYME_MERCHANT_ID = 'YOUR_MERCHANT_ID_HERE'; // User needs to provide this
const PAYME_BASE_URL = 'https://checkout.paycom.uz';

interface PaymeParams {
    merchantId: string;
    amount: number; // in tiyin (1 sum = 100 tiyin)
    account: {
        [key: string]: any;
    };
    description?: string;
}

export const paymeService = {
    /**
     * Generates a Payme checkout URL
     * @param profileId The ID of the clinic/doctor
     * @param amountSum Amount in UZS
     */
    generateCheckoutUrl(profileId: string, amountSum: number): string {
        const amountTiyin = amountSum * 100;

        // account field name must match what's configured in Payme Dashboard (e.g., "profile_id")
        const params = `m=${PAYME_MERCHANT_ID};ac.profile_id=${profileId};a=${amountTiyin};c=UZS`;

        // Base64 encode the params
        const encodedParams = btoa(params);

        return `${PAYME_BASE_URL}/${encodedParams}`;
    },

    /**
     * Validates a transaction (Placeholder for backend/edge function logic)
     * In a real implementation, this would be handled via webhooks
     */
    async verifyTransaction(transactionId: string) {
        // This would typically involve a server-to-server call to Payme API
        return { status: 'success' };
    }
};
