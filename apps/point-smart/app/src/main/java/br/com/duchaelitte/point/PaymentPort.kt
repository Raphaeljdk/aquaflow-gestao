package br.com.duchaelitte.point

/**
 * The server selects the merchant's Mercado Pago account from a verified tenant
 * session. Do not accept merchant identifiers or Neon credentials from UI input.
 */
data class ChargeRequest(
    val comandaId: String,
    val amountCents: Long,
    val idempotencyKey: String
) {
    init {
        require(comandaId.isNotBlank()) { "Comanda obrigatória." }
        require(amountCents > 0) { "Valor deve ser positivo." }
        require(idempotencyKey.isNotBlank()) { "Chave idempotente obrigatória." }
    }
}

sealed interface ChargeOutcome {
    data class Approved(val transactionId: String) : ChargeOutcome
    data object Cancelled : ChargeOutcome
    data class Rejected(val reason: String) : ChargeOutcome
    data object IntegrationUnavailable : ChargeOutcome
}

/** Implement only after receiving the official Mercado Pago SmartApps kit. */
interface PaymentPort {
    suspend fun charge(request: ChargeRequest): ChargeOutcome
}

class DisabledPaymentPort : PaymentPort {
    override suspend fun charge(request: ChargeRequest): ChargeOutcome =
        ChargeOutcome.IntegrationUnavailable
}
