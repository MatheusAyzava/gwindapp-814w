/**
 * Serviço para gerenciar upload e armazenamento de imagens
 * 
 * Opções de armazenamento:
 * 1. Supabase Storage (recomendado para muitas imagens)
 * 2. Smartsheet (Base64 em células, limitado)
 * 3. Sistema de arquivos local (não recomendado para produção)
 */

import axios from "axios";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "checklist-images";

/**
 * Upload de imagem para Supabase Storage
 * @param base64Image Imagem em Base64
 * @param fileName Nome do arquivo
 * @param folder Pasta de destino (opcional)
 * @returns URL da imagem no Supabase
 */
export async function uploadImagemParaSupabase(
  base64Image: string,
  fileName: string,
  folder?: string
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase não configurado. Configure SUPABASE_URL e SUPABASE_ANON_KEY.");
  }

  const path = folder ? `${folder}/${fileName}` : fileName;
  const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`;

  // Converter Base64 para Blob
  const binaryString = atob(base64Image);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "image/jpeg" });

  const response = await axios.put(url, blob, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true", // Sobrescrever se existir
    },
  });

  if (response.status === 200 || response.status === 201) {
    // Retornar URL pública da imagem
    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
  }

  throw new Error(`Erro ao fazer upload: ${response.statusText}`);
}

/**
 * Salva referência de imagem no Smartsheet
 * @param sheetId ID da planilha do Smartsheet
 * @param rowId ID da linha
 * @param columnId ID da coluna onde salvar a URL
 * @param imageUrl URL da imagem
 */
export async function salvarUrlImagemNoSmartsheet(
  sheetId: string,
  rowId: number,
  columnId: number,
  imageUrl: string
): Promise<void> {
  const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
  
  if (!SMARTSHEET_TOKEN) {
    throw new Error("SMARTSHEET_TOKEN não configurado");
  }

  await axios.put(
    `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows/${rowId}`,
    {
      cells: [
        {
          columnId,
          value: imageUrl,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Salva múltiplas imagens em Base64 diretamente no Smartsheet (limitado)
 * Útil para poucas imagens pequenas
 * @param sheetId ID da planilha
 * @param rowId ID da linha
 * @param columnId ID da coluna
 * @param base64Images Array de imagens em Base64
 */
export async function salvarImagensBase64NoSmartsheet(
  sheetId: string,
  rowId: number,
  columnId: number,
  base64Images: string[]
): Promise<void> {
  // Smartsheet tem limite de tamanho de célula
  // Para múltiplas imagens, melhor usar JSON com URLs
  const imagesJson = JSON.stringify(base64Images);
  
  if (imagesJson.length > 40000) {
    throw new Error("Imagens muito grandes. Use Supabase Storage em vez de Base64.");
  }

  const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
  
  if (!SMARTSHEET_TOKEN) {
    throw new Error("SMARTSHEET_TOKEN não configurado");
  }

  await axios.put(
    `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows/${rowId}`,
    {
      cells: [
        {
          columnId,
          value: imagesJson,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}




