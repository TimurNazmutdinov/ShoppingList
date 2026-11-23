// Веб (PWA): «Поделиться» через Web Share API, иначе — скачивание файла; выбор файла — через <input type="file">.

function saveBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Системное «Поделиться» для текста; без него — копирование в буфер обмена.
export async function shareText(message: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ text: message });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e;
    }
    return;
  }
  await navigator.clipboard.writeText(message);
}

// Файл отдаётся в меню «Поделиться» (iPhone: «Сохранить в Файлы»); без меню — скачивается.
export async function shareFile(name: string, content: string, mimeType: string): Promise<void> {
  const file = new File([content], name, { type: mimeType });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e;
    }
    return;
  }
  saveBlob(name, file);
}

// PDF: открывается окно печати с версткой, оттуда «Сохранить как PDF».
export async function sharePdf(html: string, title: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0';
  frame.title = title;
  document.body.appendChild(frame);
  frame.srcdoc = html;
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
  });
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 60000);
}

// Выбор файла; возвращает его текст или null, если пользователь отменил выбор.
export function pickFileText(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file ? await file.text() : null);
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}
