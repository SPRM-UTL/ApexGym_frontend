import { useEffect, useState } from "react";
import { DropzoneImagen } from "../DropzoneImagen/DropzoneImagen";
import { notifications } from "@mantine/notifications";

export function CampoImagen({ imagen, onChange , variant}) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (imagen instanceof File) {
            const url = URL.createObjectURL(imagen);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }

        setPreviewUrl(imagen || null);
        return undefined;
    }, [imagen]);

    return (
        <DropzoneImagen
            archivo={imagen instanceof File ? imagen : null}
            preview={previewUrl}
            variant={variant}
            h={180}
            onDrop={(archivos) => onChange(archivos[0] ?? null)}
            onReject={() => notifications.show({
                title: 'Imagen no válida',
                message: 'Selecciona una imagen válida de máximo 5 MB.',
                color: 'red',
            })}
        />
    );
}