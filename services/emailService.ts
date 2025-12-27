// services/emailService.ts

// TUS CREDENCIALES (Verifica que sean las correctas)
const EMAILJS_SERVICE_ID = "service_2ptdu7d"; 
const EMAILJS_TEMPLATE_ID = "template_voibff8"; 
const EMAILJS_PUBLIC_KEY = "98HcRhnLWyankTksd"; 

export const enviarCorreoAutomatico = async (
  destinatarioEmail: string, 
  nombreUsuario: string, 
  aceptado: boolean
) => {
  
  const mensaje = aceptado 
    ? `¡Felicidades ${nombreUsuario}! Tu cuenta en Amigo Rentable ha sido ACEPTADA. Ya puedes iniciar sesión y disfrutar de la plataforma.`
    : `Hola ${nombreUsuario}. Lamentamos informarte que tu solicitud de registro en Amigo Rentable ha sido RECHAZADA.`;

  const data = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: destinatarioEmail,
      to_name: nombreUsuario,
      message: mensaje,
      subject: aceptado ? "¡Bienvenido a Amigo Rentable!" : "Estado de tu solicitud",
    }
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost' // Truco para evitar algunos bloqueos de CORS
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log('Correo enviado con éxito (EmailJS)');
      return true;
    } else {
      const text = await response.text();
      console.error('Error EmailJS:', text);
      return false;
    }
  } catch (error) {
    console.error('Error de red EmailJS:', error);
    return false;
  }
};