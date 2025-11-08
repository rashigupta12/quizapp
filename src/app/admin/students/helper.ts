
// Format the submission time for display
export const formatSubmissionTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  // If within 24 hours, show relative time
  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    }
    return `${Math.floor(diffInHours)}h ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};


export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  return date.toLocaleDateString("en-GB", options);
};

interface Attempt {
  id: number;
  quizId: number;
  quizTitle: string;
  score: number;
  passed: boolean;
  completedAt: string; // This already exists - it's the submission timestamp
  startedAt?: string; // Add this if you want to show start time too
  timeSpent?: number; // Add this if you want to show duration
}

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  attempts: Attempt[];
}


interface DocumentConfig {
  joiningDate: string;
  timePeriod: string;
  issueDate: string;
  endDate: string;
  stipend: string;
  designation: string;
}
type DocType = "pdf" | "word";



export const generateOfferLetterContent = (
  student: Student,
  config: DocumentConfig
) => {
  const formattedIssueDate = formatDate(config.issueDate);
  const formattedJoiningDate = formatDate(config.joiningDate);
  const formattedEndDate = formatDate(config.endDate);

  return `
        <div style="font-family: 'Times New Roman', serif !important; line-height: 1.6; max-width: 8.5in; margin: 0 auto; color: #000000 !important; background-color: #ffffff !important; padding: 20px;">
          <div style="text-align: center; margin-bottom: 10px; color: #000000 !important;">
            <img src="https://rxo5hd130p.ufs.sh/f/q5swrPKmNsM9oTaM85w42eRf7hMqdyWPJ1QctavKoT8OLpVY" alt="Company Logo" style="width: 100px; height: auto;" />
            <div style="font-size: 16px; font-weight: bold; color: #000000 !important;">
              Gennext IT Management And Consulting Pvt Ltd
            </div>
            <div style="font-size: 12px;  color: #000000 !important;">
              33B Pocket A, Mayur Vihar, Phase 2<br>
              Delhi 110091
            </div>
          </div>
  
          <div style="text-align: right; margin-bottom: 5px; font-weight: bold; color: #000000 !important;">
            ${formattedIssueDate}
          </div>
  
          <div style="margin-bottom: 10px; color: #000000 !important;">
            ${student.name}<br>
            Email: ${student.email}
          </div>
  
          <div style="color: #000000 !important;">Dear ${student.name},</div>
  
          <div style="font-weight: bold; margin: 20px 0; color: #000000 !important;">
            Subject: Internship offer letter
          </div>
  
          <div style="margin: 15px 0; text-align: justify; color: #000000 !important;">
            We are pleased to extend to you an offer to join Gennext IT Management
            And Consulting Pvt Ltd as an Intern. We are excited about the prospect
            of you joining our team and contributing to our projects.
          </div>
  
          <ul style="padding-left: 10px; color: #000000 !important;">
            <li style="margin-bottom: 3px; color: #000000 !important;">Position: ${config.designation}</li>
            <li style="margin-bottom: 3px; color: #000000 !important;">Monthly Stipend: Rs. ${config.stipend}</li>
            <li style="margin-bottom: 3px; color: #000000 !important;">Internship Duration: Initial period of ${config.timePeriod}</li>
            <li style="margin-bottom: 3px; color: #000000 !important;">Extension: The internship may be extended based on your performance.</li>
            <li style="margin-bottom: 3px; color: #000000 !important;">Base Location: Noida</li>
          </ul>
  
          <div style="margin: 10px 0; color: #000000 !important;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #000000 !important;">Terms and Conditions of Employment:</div>
            
            <p style="color: #000000 !important;"><strong>Reporting:</strong> You will report to Atul Raj, Software Engineer</p>
            
            <p style="color: #000000 !important;"><strong>Work Hours:</strong> Our regular working hours will be 9:00 AM to 6:00 PM, Monday to Saturday.</p>
            
            <p style="color: #000000 !important;"><strong>Benefits:</strong> As part of this internship you will be provided an
            opportunity to improve your basics in full stack development and then
            work on live projects and get exposure to work on industry related
            software challenges and mitigate these through software development.</p>
          </div>
  
          <div style="page-break-before: always; margin: 15px 0; text-align: justify; padding-top: 20px; color: #000000 !important;">
            We look forward to welcoming you to Gennext IT Management And
            Consulting Pvt Ltd.
          </div>
  
          <div style="margin: 15px 0; text-align: justify; color: #000000 !important;">
            Your internship starts from <strong>${formattedJoiningDate}</strong> and will
            continue through to <strong>${formattedEndDate}</strong>, post which we will
            evaluate your performance and may offer you either extended paid
            internship or an offer letter based on your performance.
          </div>
  
          <div style=" text-align: justify; color: #000000 !important;">
            The managing committee welcomes you and looks forward to a pleasant
            and long term association with you.
          </div>
  
          <div style="margin: 15px 0; color: #000000 !important;">Thanking You,</div>
  
          <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: end;">
            <div style="text-align: center;">
              <div style="">
                <img src="https://rxo5hd130p.ufs.sh/f/q5swrPKmNsM9uAfht31kJCvqgXFyDsoUNcIdQBThGV8WZY0r" alt="Signature" style="width: 100px; height: auto;" />
              </div>
              <div style="color: #000000 !important;">Ruchi Gupta (Director HR)</div>
              <div style="color: #000000 !important;">Gennext IT Management And Consulting Pvt Ltd.</div>
            </div>
            <div style="text-align: center;">
              <div style="margin-bottom: 50px;"></div>
              <div style="color: #000000 !important;">(${student.name})</div>
              <div style="color: #000000 !important;">Candidate</div>
            </div>
          </div>
        </div>
      `;
};


export const loadLibraries = async () => {
  if (typeof window !== "undefined") {
    const promises = [];

    if (!(window as any).JSZip) {
      const jszipPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        script.onload = () => resolve((window as any).JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
      });
      promises.push(jszipPromise);
    }

    if (!(window as any).jsPDF) {
      const jspdfPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => resolve((window as any).jspdf);
        script.onerror = reject;
        document.head.appendChild(script);
      });
      promises.push(jspdfPromise);
    }

    if (!(window as any).html2canvas) {
      const html2canvasPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => resolve((window as any).html2canvas);
        script.onerror = reject;
        document.head.appendChild(script);
      });
      promises.push(html2canvasPromise);
    }

    await Promise.all(promises);
  }

  return {
    JSZip: (window as any).JSZip,
    jsPDF: (window as any).jspdf?.jsPDF,
    html2canvas: (window as any).html2canvas,
  };
};

export const sanitizeHtmlForCanvas = (htmlString: string): string => {
  // Remove any CSS that might use lab() color functions or other unsupported features
  return (
    htmlString
      .replace(/color:\s*lab\([^)]*\)/gi, "color: #000000")
      .replace(
        /background-color:\s*lab\([^)]*\)/gi,
        "background-color: #ffffff"
      )
      .replace(/border-color:\s*lab\([^)]*\)/gi, "border-color: #000000")
      // Replace any other modern CSS color functions that might not be supported
      .replace(/color:\s*oklch\([^)]*\)/gi, "color: #000000")
      .replace(/color:\s*lch\([^)]*\)/gi, "color: #000000")
      .replace(/color:\s*oklab\([^)]*\)/gi, "color: #000000")
      // Replace CSS custom properties that might contain unsupported colors
      .replace(/var\(--[^)]*\)/gi, "#000000")
      // Ensure all text is black and backgrounds are white
      .replace(
        /<div([^>]*)>/gi,
        '<div$1 style="color: #000000; background-color: transparent;">'
      )
      .replace(/<p([^>]*)>/gi, '<p$1 style="color: #000000;">')
      .replace(/<span([^>]*)>/gi, '<span$1 style="color: #000000;">')
  );
};



export const generatePDFBlob = async (
  student: Student,
  config: DocumentConfig
): Promise<Blob> => {
  const { jsPDF, html2canvas } = await loadLibraries();

  if (!jsPDF || !html2canvas) {
    throw new Error("Failed to load PDF generation libraries");
  }

  const content = generateOfferLetterContent(student, config);
  const sanitizedContent = sanitizeHtmlForCanvas(content);

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "794px"; // Approximate A4 width in px (at 96dpi)
  iframe.style.height = "auto";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Failed to create iframe document");
  }

  iframeDoc.open();
  iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: 'Times New Roman', serif;
                background-color: #ffffff;
                color: #000000;
                width: 794px;
              }
              * {
                box-sizing: border-box;
                color: #000000 !important;
                background-color: transparent !important;
                border-color: #000000 !important;
              }
            </style>
          </head>
          <body>
            ${sanitizedContent}
          </body>
        </html>
      `);
  iframeDoc.close();

  try {
    // Wait for images to load
    const images = iframeDoc.querySelectorAll("img");
    const loadPromises = Array.from(images).map(
      (img: HTMLImageElement) =>
        new Promise((resolve, reject) => {
          if (img.complete) {
            resolve(null);
          } else {
            img.onload = resolve;
            img.onerror = reject;
          }
        })
    );
    await Promise.all(loadPromises);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const scale = 2;
    const pageWidthPx = 794;
    const pageHeightPx = 1123;

    const canvas = await html2canvas(iframeDoc.body, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      width: pageWidthPx,
      windowWidth: pageWidthPx,
      logging: false,
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [pageWidthPx, pageHeightPx],
    });

    const canvasPageHeight = pageHeightPx * scale;
    let sourceY = 0;
    let pageCount = 0;

    while (sourceY < canvasHeight) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasWidth;
      const remainingHeight = canvasHeight - sourceY;
      tempCanvas.height = Math.min(canvasPageHeight, remainingHeight);

      // Skip adding a page if the remaining height is too small (e.g., less than 10px)
      if (tempCanvas.height < 10) {
        break;
      }

      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) throw new Error("Failed to get temp canvas context");

      tempCtx.drawImage(
        canvas,
        0,
        sourceY,
        canvasWidth,
        tempCanvas.height,
        0,
        0,
        canvasWidth,
        tempCanvas.height
      );

      const tempImgData = tempCanvas.toDataURL("image/png");
      if (pageCount > 0) {
        pdf.addPage();
      }
      pdf.addImage(
        tempImgData,
        "PNG",
        0,
        0,
        pageWidthPx,
        tempCanvas.height / scale
      );

      sourceY += tempCanvas.height;
      pageCount++;
    }

    return new Blob([pdf.output("blob")], { type: "application/pdf" });
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  } finally {
    document.body.removeChild(iframe);
  }
};
export const generateWordBlob = (student: Student, config: DocumentConfig): Blob => {
  const content = generateOfferLetterContent(student, config);

  const wordDocument = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:w="urn:schemas-microsoft-com:office:word"
                xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>Internship Offer Letter</title>
            <style>
              @page {
                size: A4;
                margin: 1in;
              }
              body {
                font-family: 'Times New Roman', serif;
                font-size: 11pt;
                line-height: 1.6;
                color: #000000;
                background-color: #ffffff;
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
          </html>
        `;

  return new Blob([wordDocument], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
};



