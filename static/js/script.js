$(document).ready(function () {
    let table = $('#imageTable').DataTable({
        "paging": true,
        "searching": true,
        "ordering": true,
        "order": [[1, "asc"]]
    });

    document.getElementById('uploadButton').addEventListener('click', function () {
        const fileInput = document.getElementById('fileInput');
        const files = Array.from(fileInput.files); // Список выбранных файлов

        if (files.length === 0) {
            alert("Файлы не выбраны.");
            return;
        }

        files.forEach(file => {
            if (file.type === "application/zip" || file.type === "application/x-zip-compressed") {
                processZip(file); // Обработка zip-архива
            } else {
                processFiles([file]); // Обработка изображения
            }
        });

        fileInput.value = '';
    });

    document.getElementById('clearTableButton').addEventListener('click', function () {
        table.clear().draw(); // Очистка таблицы
    });

    async function processFiles(files) {
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (!isSupportedFormat(file.type)) {
                alert(`Формат ${file.type} не поддерживается.`);
                continue;
            }

            let reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async function (e) {
                let img = new Image();
                img.src = e.target.result;

                img.onload = async function () {
                    let format = file.type.split("/")[1].toUpperCase();
                    let fileName = file.name.split('/').pop();
                    let size = `${img.width}x${img.height}`;
                    let depth = await getBitDepth(file);
                    let colorMode = await getColorMode(file);
                    let compression = getCompressionType(file);

                    table.row.add([
                        format,
                        fileName,
                        size,
                        depth,
                        colorMode,
                        compression
                    ]).draw(false);
                };
            };
        }
    }

    async function processZip(zipFile) {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);

        const files = Object.keys(content.files).map(filename => content.files[filename]);

        for (const file of files) {
            if (!file.dir) {
                const blob = await file.async("blob");
                const imgFile = new File([blob], file.name, { type: getFileType(file.name) });
                await processFiles([imgFile]);
            }
        }
    }

    function isSupportedFormat(type) {
        const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'application/zip', 'application/x-zip-compressed'];
        return supportedFormats.includes(type);
    }

    function getFileType(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'gif':
                return 'image/gif';
            case 'bmp':
                return 'image/bmp';
            case 'tiff':
            case 'tif':
                return 'image/tiff';
            default:
                return 'application/octet-stream';
        }
    }

    function getBitDepth(file) {
        return new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = function(event) {
                const data = event.target.result;
                const header = new DataView(data);
                switch (file.type) {
                    case 'image/jpeg':
                        resolve(24);
                        break;
                    case 'image/png':
                        const bitDepthPNG = header.getUint8(24);
                        resolve(bitDepthPNG === 8 ? 32 : 24);
                        break;
                    case 'image/gif':
                        resolve(8);
                        break;
                    case 'image/bmp':
                        const bitsPerPixel = header.getUint16(28, true);
                        resolve(bitsPerPixel);
                        break;
                    case 'image/tiff':
                        const tiffBitsPerSample = header.getUint16(14, true);
                        resolve(tiffBitsPerSample);
                        break;
                    default:
                        resolve("Unknown");
                }
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    function getColorMode(file) {
        return new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = function(event) {
                const data = event.target.result;
                const header = new DataView(data);
                switch (file.type) {
                    case 'image/jpeg':
                        resolve("RGB");
                        break;
                   case 'image/png':
                    const colorType = header.getUint8(25); // 26-й байт определяет цветовой тип
                    if (colorType === 6) {
                        resolve("RGBA"); // PNG с альфа-каналом
                    } else {
                        resolve("RGB"); // PNG без альфа-канала
                    }
                    break;
                    case 'image/gif':
                        resolve("Indexed");
                        break;
                    case 'image/bmp':
                        const bitsPerPixel = header.getUint16(28, true);
                        if (bitsPerPixel === 8) {
                            resolve("L");
                        } else if (bitsPerPixel === 24) {
                            resolve("RGB");
                        } else if (bitsPerPixel === 32) {
                            resolve("RGBA");
                        } else {
                            resolve("Unknown");
                        }
                        break;
                    case 'image/tiff':
                        const tiffSamplesPerPixel = header.getUint16(16, true);
                        if (tiffSamplesPerPixel === 1) {
                            resolve("Gray");
                        } else if (tiffSamplesPerPixel === 3) {
                            resolve("RGB");
                        } else if (tiffSamplesPerPixel === 4) {
                            resolve("RGBA");
                        } else {
                            resolve("Unknown");
                        }
                        break;
                    default:
                        resolve("Unknown");
                }
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

function getCompressionType(fileType) {
    switch (fileType) {
        case 'image/jpeg':
            return 'JPEG Compression';
        case 'image/png':
            return 'Deflate/Inflate Compression';
        case 'image/gif':
            return 'LZW Compression';
        case 'image/tiff':
            return 'Varies (LZW, JPEG, etc.)';
        case 'image/bmp':
            return 'None';
        default:
            return 'Unknown';
    }
}
});
