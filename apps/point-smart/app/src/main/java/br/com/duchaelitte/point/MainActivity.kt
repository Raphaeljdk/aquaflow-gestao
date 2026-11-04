package br.com.duchaelitte.point

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Native SmartPOS foundation — no WebView, no payment simulation.
 * A Mercado Pago-approved SDK integration is required before enabling checkout.
 */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val background = Color.rgb(7, 23, 52)
        val yellow = Color.rgb(250, 204, 21)

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 32, 24, 24)
            setBackgroundColor(background)
        }
        fun title(text: String, size: Float, color: Int) {
            column.addView(TextView(this).apply {
                this.text = text
                textSize = size
                setTextColor(color)
                setPadding(0, 0, 0, 16)
            })
        }
        title("AQUAFLOW", 24f, yellow)
        title("Atendimento e pagamentos", 18f, Color.WHITE)
        title("Estrutura inicial para a Point Smart. O fluxo de vendas só será liberado após autorização, integração com SDK e homologação do Mercado Pago.", 14f, Color.LTGRAY)
        listOf("Nova comanda", "Comandas abertas", "Cobrar na Point", "Imprimir comprovante").forEach { label ->
            column.addView(Button(this).apply {
                text = "$label · em preparação"
                isEnabled = false
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 12 }
            })
        }
        title("Nenhuma cobrança será iniciada por esta versão.", 13f, yellow)
        setContentView(ScrollView(this).apply {
            isFillViewport = true
            addView(column)
        })
    }
}
