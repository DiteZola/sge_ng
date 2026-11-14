import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  Upload,
  Keyboard,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { Aluno, Turma } from '../types';
import { ParsedQrResult, parseStudentQrPayload } from '../utils/qrCodeUtils';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  alunos: Aluno[];
  turmas?: Turma[];
  title?: string;
  titulo?: string;
  subtitle?: string;
  subtitulo?: string;
  actionButtonLabel?: string;
  acaoRotulo?: string;
  keepOpenAfterScan?: boolean;
  onScanVerified?: (result: ParsedQrResult, aluno: Aluno) => void;
  onStudentMatched?: (aluno: Aluno, result: ParsedQrResult) => void;
  children?: React.ReactNode;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  alunos,
  turmas = [],
  title,
  titulo,
  subtitle,
  subtitulo,
  actionButtonLabel,
  acaoRotulo,
  keepOpenAfterScan = true,
  onScanVerified,
  onStudentMatched,
  children
}) => {
  const modalTitle = titulo || title || 'Leitor Oficial de Código QR do Passe Escolar';
  const modalSubtitle =
    subtitulo ||
    subtitle ||
    'Aponte a câmara para o passe do estudante, carregue uma foto/imagem ou utilize um leitor USB / código de matrícula.';
  const modalActionLabel = acaoRotulo || actionButtonLabel || 'Confirmar Registo';
  const [modo, setModo] = useState<'camera' | 'imagem' | 'manual'>('camera');
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraErro, setCameraErro] = useState<string | null>(null);
  const [codigoManual, setCodigoManual] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState<ParsedQrResult | null>(null);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const cooldownRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const pararCamera = () => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      streamRef.current = null;
    }
    setCameraAtiva(false);
  };

  const processarTextoDecodificado = (rawText: string) => {
    const agora = Date.now();
    if (cooldownRef.current.code === rawText && agora - cooldownRef.current.at < 2200) {
      return;
    }
    cooldownRef.current = { code: rawText, at: agora };

    const parsed = parseStudentQrPayload(rawText, alunos);
    setUltimoResultado(parsed);

    if (parsed.matchedAluno) {
      setMensagemStatus({
        tipo: 'ok',
        texto: `Estudante identificado: ${parsed.matchedAluno.nomeCompleto} (${parsed.matchedAluno.codigoMatricula}).`
      });
      onScanVerified?.(parsed, parsed.matchedAluno);
      onStudentMatched?.(parsed.matchedAluno, parsed);
      if (!keepOpenAfterScan) {
        pararCamera();
        onClose();
      }
    } else {
      setMensagemStatus({
        tipo: 'erro',
        texto: `Código QR lido ("${rawText.slice(0, 48)}${rawText.length > 48 ? '...' : ''}"), mas nenhum estudante correspondente foi encontrado nesta instituição.`
      });
    }
  };

  const iniciarCamera = async () => {
    pararCamera();
    setCameraErro(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraErro('Este navegador ou contexto não suporta acesso directo à câmara. Utilize "Carregar Imagem" ou "Leitor USB / Manual".');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraAtiva(true);

      scanTimerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const qr = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });
        if (qr && qr.data) {
          processarTextoDecodificado(qr.data);
        }
      }, 180);
    } catch (err: any) {
      setCameraErro(
        err?.name === 'NotAllowedError'
          ? 'Permissão de câmara recusada. Autorize a câmara no navegador ou utilize o carregamento de imagem / leitor manual.'
          : 'Não foi possível iniciar a câmara neste dispositivo. Utilize "Carregar Imagem" ou "Leitor USB / Manual".'
      );
      setCameraAtiva(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      pararCamera();
      setUltimoResultado(null);
      setMensagemStatus(null);
      setCodigoManual('');
      return;
    }
    if (modo === 'camera') {
      iniciarCamera();
    } else {
      pararCamera();
    }
    return () => {
      pararCamera();
    };
  }, [isOpen, modo]);

  const handleUploadImagemQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensagemStatus(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data) {
          processarTextoDecodificado(code.data);
        } else {
          setMensagemStatus({
            tipo: 'erro',
            texto: 'Nenhum Código QR legível encontrado na imagem carregada. Aproxime ou aumente o contraste da imagem.'
          });
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmeterManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoManual.trim()) return;
    processarTextoDecodificado(codigoManual.trim());
    setCodigoManual('');
  };

  if (!isOpen) return null;

  const alunoEncontrado = ultimoResultado?.matchedAluno;
  const turmaAluno = alunoEncontrado ? turmas.find(t => t.id === alunoEncontrado.turmaId) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-start space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{modalTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{modalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              pararCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            {children}
          </div>
        )}

        {/* Seleção de Modo de Leitura */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setModo('camera')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
              modo === 'camera' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Câmara</span>
          </button>
          <button
            type="button"
            onClick={() => setModo('imagem')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
              modo === 'imagem' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Imagem QR</span>
          </button>
          <button
            type="button"
            onClick={() => setModo('manual')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
              modo === 'manual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Leitor / Código</span>
          </button>
        </div>

        {/* MODO 1: CÂMARA AO VIVO */}
        {modo === 'camera' && (
          <div className="space-y-2">
            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border-2 border-slate-800">
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraAtiva && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-44 border-2 border-emerald-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              )}

              {!cameraAtiva && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white bg-slate-900/90 space-y-2">
                  <Camera className="w-8 h-8 text-slate-400" />
                  <p className="text-xs text-slate-300 max-w-sm">
                    {cameraErro || 'A inicializar câmara para leitura do Código QR...'}
                  </p>
                  <button
                    type="button"
                    onClick={iniciarCamera}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODO 2: CARREGAMENTO DE IMAGEM */}
        {modo === 'imagem' && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 rounded-xl p-6 cursor-pointer transition-colors text-center space-y-2">
            <Upload className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-bold text-blue-950">
              Clique para selecionar uma fotografia ou captura de ecrã do Passe / Documento QR
            </span>
            <span className="text-[11px] text-slate-500">
              Suporta PNG, JPG, JPEG e WEBP com descodificação instantânea local
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImagemQr}
              className="hidden"
            />
          </label>
        )}

        {/* MODO 3: LEITOR USB / DIGITAÇÃO MANUAL */}
        {modo === 'manual' && (
          <form onSubmit={handleSubmeterManual} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700">
              Código QR Lido (Leitor USB/Bluetooth) ou N.º Matrícula / Processo / BI do Estudante:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  value={codigoManual}
                  onChange={(e) => setCodigoManual(e.target.value)}
                  placeholder="Ex: SGE1|PASS|... ou 2025/MED-1234 ou BI"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
              >
                {modalActionLabel}
              </button>
            </div>
          </form>
        )}

        {/* Feedback do Resultado da Leitura */}
        {mensagemStatus && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
              mensagemStatus.tipo === 'ok'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {mensagemStatus.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-bold">{mensagemStatus.texto}</p>
              {alunoEncontrado && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-200 flex items-center space-x-3">
                  {alunoEncontrado.fotoUrl ? (
                    <img
                      src={alunoEncontrado.fotoUrl}
                      alt={alunoEncontrado.nomeCompleto}
                      className="w-10 h-12 rounded object-cover border border-slate-300 shrink-0"
                    />
                  ) : null}
                  <div className="text-[11px] space-y-0.5">
                    <div className="font-black text-slate-900 uppercase">{alunoEncontrado.nomeCompleto}</div>
                    <div className="text-slate-600">
                      Classe/Turma: <strong>{turmaAluno?.classe || alunoEncontrado.classeId} • {turmaAluno?.nome || '—'}</strong>
                    </div>
                    <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {ultimoResultado?.checksumValid ? 'Assinatura Digital SGE/MED Verificada' : 'Estudante Localizado na Escola'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              pararCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
          >
            Fechar Leitor
          </button>
        </div>
      </div>
    </div>
  );
};
