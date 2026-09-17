import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const ink = "#171717";
const paper = "#F7F3EA";
const gold = "#D9B455";
const muted = "#756E62";

async function pngFromSvg(svg, out, width, height) {
  await mkdir(new URL(".", `file://${process.cwd()}/${out}`), { recursive: true });
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(out);
}

function appIcon(size = 1024) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${ink}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.26}" fill="none" stroke="${gold}" stroke-width="${size * 0.022}"/>
    <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="${size * 0.3}" font-weight="700" fill="${paper}">K</text>
    <path d="M${size * 0.31} ${size * 0.68} H${size * 0.69}" stroke="${gold}" stroke-width="${size * 0.018}" stroke-linecap="round"/>
  </svg>`;
}

function featureGraphic() {
  return `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="500" fill="${ink}"/>
    <circle cx="858" cy="82" r="210" fill="none" stroke="${gold}" stroke-opacity=".24" stroke-width="2"/>
    <text x="72" y="118" fill="${gold}" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5">COOPERA KÓS</text>
    <text x="72" y="226" fill="${paper}" font-family="Georgia, serif" font-size="76" font-weight="700">Casos clínicos</text>
    <text x="72" y="306" fill="${gold}" font-family="Georgia, serif" font-size="64" font-style="italic">em comunidade.</text>
    <text x="74" y="370" fill="#D8D2C4" font-family="Arial, sans-serif" font-size="24">Acesso por convite · ambiente educacional supervisionado</text>
  </svg>`;
}

function conceptScreen(title, accent, body, rows) {
  const renderedRows = rows.map((row, index) => {
    const y = 1090 + index * 250;
    return `<rect x="105" y="${y}" width="1080" height="184" rx="28" fill="#FFFDF7" stroke="#E5DCCB"/>
      <text x="150" y="${y + 65}" fill="${ink}" font-family="Arial, sans-serif" font-size="34" font-weight="700">${row[0]}</text>
      <text x="150" y="${y + 120}" fill="${muted}" font-family="Arial, sans-serif" font-size="27">${row[1]}</text>`;
  }).join("");
  return `<svg width="1290" height="2796" viewBox="0 0 1290 2796" xmlns="http://www.w3.org/2000/svg">
    <rect width="1290" height="2796" fill="${paper}"/>
    <rect x="58" y="58" width="1174" height="2680" rx="82" fill="#FFFDF7" stroke="#E5DCCB" stroke-width="3"/>
    <text x="105" y="190" fill="${gold}" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="5">COOPERA KÓS</text>
    <text x="105" y="355" fill="${ink}" font-family="Georgia, serif" font-size="92" font-weight="700">${title}</text>
    <text x="105" y="455" fill="${gold}" font-family="Georgia, serif" font-size="82" font-style="italic">${accent}</text>
    <path d="M105 535 H420" stroke="${gold}" stroke-width="8"/>
    <text x="105" y="645" fill="${muted}" font-family="Arial, sans-serif" font-size="36">${body}</text>
    <rect x="105" y="765" width="1080" height="210" rx="34" fill="#FAF3DD" stroke="#E6D6A5"/>
    <text x="155" y="850" fill="${ink}" font-family="Arial, sans-serif" font-size="34" font-weight="700">Acesso por convite</text>
    <text x="155" y="910" fill="${muted}" font-family="Arial, sans-serif" font-size="28">Dados anonimizados obrigatórios</text>
    ${renderedRows}
    <text x="105" y="2580" fill="#9B9488" font-family="Arial, sans-serif" font-size="24">Base visual para planejamento. Capturar a tela real antes de submeter.</text>
  </svg>`;
}

await pngFromSvg(appIcon(1024), "apps/mobile/assets/icon.png", 1024, 1024);
await pngFromSvg(appIcon(1024), "apps/mobile/assets/splash.png", 1024, 1024);
await pngFromSvg(appIcon(512), "store-assets/google-play/icon-512.png", 512, 512);
await pngFromSvg(featureGraphic(), "store-assets/google-play/feature-graphic-1024x500.png", 1024, 500);
await pngFromSvg(conceptScreen("Casos clínicos", "em comunidade.", "Organize o aprendizado da sua turma.", [["Feed da turma", "Casos anonimizados em ordem"], ["Busca e filtros", "Encontre técnica, tema ou status"], ["Síntese educacional", "Conteúdo para consulta posterior"]]), "store-assets/screenshots-base/01-casos.png", 1290, 2796);
await pngFromSvg(conceptScreen("Contexto claro", "para decidir melhor.", "Leia pergunta, tags e anexos privados.", [["Pergunta à comunidade", "Discussão focada"], ["Mídia privada", "Acesso apenas por sessão"], ["Histórico preservado", "Sem perder conteúdo no chat"]]), "store-assets/screenshots-base/02-caso.png", 1290, 2796);
await pngFromSvg(conceptScreen("Publique com", "anonimização.", "O aceite é obrigatório antes do envio.", [["Título e contexto", "Estrutura mínima para qualidade"], ["Anexo opcional", "Imagem clínica anonimizada"], ["Aviso educacional", "Responsabilidade do médico assistente"]]), "store-assets/screenshots-base/03-publicar.png", 1290, 2796);
await pngFromSvg(conceptScreen("Comunidade", "por convite.", "Perfil, termos e exclusão de conta.", [["Turma ativa", "Participação fechada"], ["Termos vigentes", "Aceite versionado"], ["Exclusão de conta", "Solicitação registrada"]]), "store-assets/screenshots-base/04-perfil.png", 1290, 2796);

await writeFile("store-assets/README.md", `# Store assets\n\nArquivos base gerados por \`npm run store:assets\`.\n\n- \`google-play/icon-512.png\`: ícone para Google Play.\n- \`google-play/feature-graphic-1024x500.png\`: arte base para Google Play.\n- \`screenshots-base/*.png\`: bases visuais para planejamento. Não submeter sem substituir por capturas reais do binário final.\n\n`, "utf8");
