// components/facturas/FacturaModal.tsx
import { useEffect, useState } from "react";
// @ts-ignore
import { apiFetch } from "@/services/api";

type FacturaData = {
    factura_url: string;
    fecha_compra: string;
    nombre_user: string;
};

type Props = {
    insumo_id: number;
    onClose: () => void;
};

export default function FacturaModal({ insumo_id, onClose }: Props) {
    const [factura, setFactura] = useState<FacturaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadFactura = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiFetch(`inv_insumos/factura_by_id/${insumo_id}`) as FacturaData;
                console.log("Factura data:", data);
                setFactura(data);
            } catch(err) {
                setError("Este insumo no tiene factura registrada.");
                console.log("Error completo:", err);
            } finally {
                setLoading(false);
            }
        };
        loadFactura();
    }, [insumo_id]);

    const esImagen = factura ? /\.(jpg|jpeg|png)$/i.test(factura.factura_url) : false;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">

                {/* Header */}
                <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Factura de compra
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenido */}
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-600" />
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                        {error}
                    </div>
                ) : factura ? (
                    <>
                        {/* Datos */}
                        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-400">Fecha de compra</p>
                                <p className="font-medium text-gray-800 dark:text-white/90">{factura.fecha_compra}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Registrado por</p>
                                <p className="font-medium text-gray-800 dark:text-white/90">{factura.nombre_user}</p>
                            </div>
                        </div>

                        {/* Archivo */}
                        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            {esImagen ? (
                                <img
                                    src={`http://localhost:8000${factura.factura_url}`}
                                    alt="Factura"
                                    className="max-h-96 w-full rounded-lg object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <span className="text-4xl">📄</span>
                                    <p className="text-sm text-gray-500">Archivo PDF adjunto</p>
                                    <a
                                        href={`http://localhost:8000${factura.factura_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900"
                                    >
                                        Ver PDF
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}

                {/* Footer */}
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}