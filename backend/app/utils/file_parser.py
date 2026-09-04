import io
import os
from typing import Tuple
from fastapi import UploadFile, HTTPException

def extract_text_from_file(file: UploadFile) -> Tuple[str, str]:
    """
    Extract raw text from uploaded TXT, PDF, or DOCX file.
    Returns (extracted_text, file_type).
    """
    filename = file.filename or "uploaded_file"
    ext = os.path.splitext(filename)[1].lower()

    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if ext == ".txt":
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content.decode("latin-1")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode TXT file: {str(e)}")
        return text, "TXT"

    elif ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            extracted_pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_pages.append(page_text)
            text = "\n".join(extracted_pages)
            if not text.strip():
                raise HTTPException(status_code=400, detail="Could not extract text from PDF. It may be scanned or image-only.")
            return text, "PDF"
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}")

    elif ext in [".docx", ".doc"]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            full_text = []
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
            text = "\n".join(full_text)
            if not text.strip():
                raise HTTPException(status_code=400, detail="Could not extract text from DOCX file.")
            return text, "DOCX"
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX document: {str(e)}")

    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format '{ext}'. Please upload TXT, PDF, or DOCX files."
        )
