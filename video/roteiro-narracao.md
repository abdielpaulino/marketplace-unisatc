# Roteiro de narração: "Caio e o UniSatc Marketplace"

Vídeo: `caio-unisatc-marketplace.mp4` (1280x720, 51s, **já com a narração sincronizada**)

A animação foi ajustada ao ritmo da narração gravada (`Generated Audio November 20, 2026 - 11_22PM.wav`). Os tempos abaixo são os da versão final.

Leia a narração no ritmo de cada bloco. Os tempos indicam quando a cena aparece na tela.

> **Pronúncia:** na narração, "UniSatc" está escrito do jeito que se fala, **"Uni Sátiqui"**, para a IA de voz não errar. Nos textos que aparecem na tela do vídeo continua "UniSatc".

| Tempo | Cena | Narração |
|---|---|---|
| 0:00–0:04 | Caio chega andando no campus, para e acena. Aparece o nome dele | "Esse é o Caio, calouro de Engenharia Mecânica aqui na Uni Sátiqui." |
| 0:04–0:14 | Loja de uniformes: jaleco de mecânico a **R$ 180**. Caio leva um susto, reclama e fica cabisbaixo. Só tem R$ 30 e as moedas caem | "Logo na primeira semana, ele precisou de um jaleco de mecânico pras aulas de oficina. Na loja: cento e oitenta reais. Caro demais pra quem tá começando." |
| 0:14–0:20 | Fila de 25 min na cantina e o fone perdido no Prédio 7 | "E não parava por aí: fila enorme na cantina no intervalo, e ainda perdeu o fone em algum lugar do Prédio 7." |
| 0:20–0:25 | Um colega chega com o celular: "Já conhece o UniSatc Marketplace?" Caio tem a ideia e levanta o dedo | "Foi aí que um colega perguntou: já conhece o Uni Sátiqui Marketplace?" |
| 0:25–0:29 | Celular: busca por "jaleco" | "É o marketplace da nossa comunidade. Ele buscou 'jaleco'…" |
| 0:29–0:33 | Anúncio do jaleco usado: ~~R$ 180~~ **R$ 45** | "…e achou um jaleco de mecânico usado, de uma veterana, por quarenta e cinco reais." |
| 0:33–0:40 | Doações, cantina sem fila, achados e perdidos | "E tem mais: dá pra doar o que não usa, pedir na cantina sem fila e procurar o que foi perdido no campus." |
| 0:40–0:45 | Caio de jaleco, pulando de alegria. "Economizou R$ 135", e sobrou pro lanche | "Resultado: o Caio economizou cento e trinta e cinco reais, e ainda sobrou pro lanche." |
| 0:45–0:51 | Logo e "UniSatc Marketplace: da comunidade, pra comunidade" | "Uni Sátiqui Marketplace. Da comunidade, pra comunidade." |

## Texto corrido para colar na IA de voz
Cole cada parágrafo separado. Assim fica fácil encaixar cada fala na sua cena no editor.

```
Esse é o Caio, calouro de Engenharia Mecânica aqui na Uni Sátiqui.

Logo na primeira semana, ele precisou de um jaleco de mecânico pras aulas de oficina. Na loja: cento e oitenta reais. Caro demais pra quem tá começando.

E não parava por aí: fila enorme na cantina no intervalo, e ainda perdeu o fone em algum lugar do Prédio 7.

Foi aí que um colega perguntou: já conhece o Uni Sátiqui Marketplace?

É o marketplace da nossa comunidade. Ele buscou "jaleco"… e achou um jaleco de mecânico usado, de uma veterana, por quarenta e cinco reais.

E tem mais: dá pra doar o que não usa, pedir na cantina sem fila e procurar o que foi perdido no campus.

Resultado: o Caio economizou cento e trinta e cinco reais, e ainda sobrou pro lanche.

Uni Sátiqui Marketplace. Da comunidade, pra comunidade.
```

**Se ainda sair errado:**
- Tente sem acento, "Uni Satiqui", ou com hífen, "Uni-Sátiqui". Cada voz de IA lê de um jeito.
- Se a ferramenta aceitar SSML (ElevenLabs, Azure, Google), use `<sub alias="Uni Sátiqui">UniSatc</sub>`.
- Se "Marketplace" também sair estranho, escreva "Márket-pleis".

## Dicas para gravar a narração
- No celular, use o gravador de voz num lugar silencioso. Depois junte voz e vídeo no CapCut ou no Clipchamp (o Clipchamp já vem no Windows).
- Se a fala ficar mais longa que a cena, no editor dá para congelar o último quadro ou diminuir a velocidade daquele trecho.
- Uma trilha de fundo baixinha (biblioteca de áudio do CapCut ou do YouTube) ajuda bastante.

## Como gerar o vídeo de novo
Com o site rodando (`npm run dev`), abra `http://localhost:5173/video/animacao.html`. A animação começa sozinha.
Para ver um momento exato parado: `animacao.html?t=38&freeze` (segundo 38).
