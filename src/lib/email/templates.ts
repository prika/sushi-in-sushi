import type { Reservation, Location } from "@/types/database";

// Base URL for assets (logo, etc.) - should be your production domain
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const LOGO_URL = `${BASE_URL}/logo.png`;

const locationDetails: Record<
  Location,
  {
    name: string;
    address: string;
    phone: string;
    email: string;
    coordinates: { lat: number; lng: number };
    mapsUrl: string;
  }
> = {
  circunvalacao: {
    name: "Sushi in Sushi - Circunvalação",
    address: "Rua da Circunvalação 1234, Porto",
    phone: "+351 220 123 456",
    email: "circunvalacao@sushinsushi.pt",
    coordinates: { lat: 41.1579, lng: -8.6291 },
    mapsUrl: "https://maps.google.com/?q=Sushi+in+Sushi+Circunvalação+Porto",
  },
  boavista: {
    name: "Sushi in Sushi - Boavista",
    address: "Avenida da Boavista 5678, Porto",
    phone: "+351 220 654 321",
    email: "boavista@sushinsushi.pt",
    coordinates: { lat: 41.1621, lng: -8.6455 },
    mapsUrl: "https://maps.google.com/?q=Sushi+in+Sushi+Boavista+Porto",
  },
};

// Generate static map URL (using free service that doesn't require API key)
const getStaticMapUrl = (lat: number, lng: number) => {
  // Using OpenStreetMap static map service (free, no API key required)
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=500x280&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const occasionLabels: Record<string, string> = {
  birthday: "Aniversário",
  anniversary: "Celebração",
  business: "Negócios",
  other: "Outro",
};

// Common email styles with Google Fonts
const getEmailHead = (title: string) => `
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  </style>
</head>
`;

// Font stack
const fontSans =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function getCustomerConfirmationEmail(reservation: Reservation) {
  const location = locationDetails[reservation.location];

  return {
    subject: `🍣 Reserva Recebida - ${formatDate(reservation.reservation_date)}`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Confirmação de Reserva")}
<body style="margin: 0; padding: 0; font-family: ${fontSans}; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">

          <!-- Header with Logo and Decorative Elements -->
          <tr>
            <td style="padding: 55px 45px 45px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-bottom: 2px solid #D4AF37;">
              <img src="${LOGO_URL}" alt="Sushi in Sushi" width="220" height="auto" style="display: block; margin: 0 auto 30px;" />
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 18px;">
                    <span style="color: #D4AF37; font-size: 32px;">✦</span>
                  </td>
                  <td>
                    <p style="margin: 0; font-family: ${fontSans}; color: #D4AF37; font-size: 22px; letter-spacing: 5px; text-transform: uppercase; font-weight: 600;">Reserva Recebida</p>
                  </td>
                  <td style="padding: 0 18px;">
                    <span style="color: #D4AF37; font-size: 32px;">✦</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting Section -->
          <tr>
            <td style="padding: 50px 50px 40px;">
              <p style="margin: 0 0 24px; font-family: ${fontSans}; color: #fff; font-size: 36px; font-weight: 400;">
                Olá <strong style="font-weight: 700;">${reservation.first_name}</strong> 👋
              </p>
              <p style="margin: 0; font-family: ${fontSans}; color: #b0b0b0; font-size: 22px; line-height: 1.8;">
                Recebemos o seu pedido de reserva com sucesso! Entraremos em contacto brevemente para confirmar a disponibilidade.
              </p>
            </td>
          </tr>

          <!-- Main Reservation Card -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%); border-radius: 20px; overflow: hidden; border: 1px solid #333;">

                <!-- Card Header -->
                <tr>
                  <td style="padding: 28px 35px; background: linear-gradient(90deg, #D4AF37 0%, #c9a432 100%); text-align: center;">
                    <p style="margin: 0; font-family: ${fontSans}; color: #000; font-size: 24px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">
                      📋 Detalhes da Reserva
                    </p>
                  </td>
                </tr>

                <!-- Date & Time Hero -->
                <tr>
                  <td style="padding: 40px 35px; text-align: center; border-bottom: 1px solid #333;">
                    <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #888; font-size: 18px; text-transform: uppercase; letter-spacing: 3px;">Data & Hora</p>
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #fff; font-size: 32px; font-weight: 600;">${formatDate(reservation.reservation_date)}</p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #D4AF37; font-size: 56px; font-weight: 700;">${reservation.reservation_time}</p>
                  </td>
                </tr>

                <!-- Details Grid -->
                <tr>
                  <td style="padding: 35px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <!-- Pessoas -->
                      <tr>
                        <td style="padding: 22px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px; vertical-align: middle;">
                                <span style="font-size: 34px;">👥</span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Pessoas</p>
                                <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #fff; font-size: 26px; font-weight: 700;">${reservation.party_size} pessoas</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Restaurante -->
                      <tr>
                        <td style="padding: 22px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px; vertical-align: middle;">
                                <span style="font-size: 34px;">📍</span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Restaurante</p>
                                <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #fff; font-size: 24px; font-weight: 600;">${location.name}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Serviço -->
                      <tr>
                        <td style="padding: 22px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px; vertical-align: middle;">
                                <span style="font-size: 34px;">🍣</span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Serviço</p>
                                <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #D4AF37; font-size: 26px; font-weight: 700;">${reservation.is_rodizio ? "Rodízio All You Can Eat" : "À Carta"}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${
                      reservation.occasion
                        ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 25px; padding-top: 25px; border-top: 1px solid #333;">
                      <tr>
                        <td style="width: 55px; vertical-align: middle;">
                          <span style="font-size: 34px;">🎉</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Ocasião</p>
                          <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #fff; font-size: 24px; font-weight: 600;">${occasionLabels[reservation.occasion] || reservation.occasion}</p>
                        </td>
                      </tr>
                    </table>
                    `
                        : ""
                    }

                    ${
                      reservation.special_requests
                        ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 25px; padding: 25px; background-color: #2d2d2d; border-radius: 14px; border-left: 5px solid #D4AF37;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 17px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">💬 Pedidos Especiais</p>
                          <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 22px; font-style: italic; line-height: 1.6;">"${reservation.special_requests}"</p>
                        </td>
                      </tr>
                    </table>
                    `
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location & Map Section -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <!-- Map Image -->
                <tr>
                  <td>
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; text-decoration: none;">
                      <img src="${getStaticMapUrl(location.coordinates.lat, location.coordinates.lng)}" alt="Mapa - ${location.name}" width="100%" style="display: block; width: 100%; height: auto; border-radius: 20px 20px 0 0;" />
                    </a>
                  </td>
                </tr>
                <!-- Open in Maps Button -->
                <tr>
                  <td style="padding: 0;">
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; padding: 18px 35px; background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); font-family: ${fontSans}; color: #fff; font-size: 20px; font-weight: 600; text-decoration: none; text-align: center;">
                      📍 Abrir no Google Maps → Obter Direções
                    </a>
                  </td>
                </tr>
                <!-- Address & Contact -->
                <tr>
                  <td style="padding: 30px 35px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #D4AF37; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${location.name.replace("Sushi in Sushi - ", "")}</p>
                    <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #fff; font-size: 20px; line-height: 1.5;">${location.address}</p>

                    <!-- Contact Buttons Row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right: 8px;" width="50%">
                          <a href="tel:${location.phone.replace(/\s/g, "")}" style="display: block; padding: 16px 10px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 12px; font-family: ${fontSans}; color: #000; font-size: 18px; font-weight: 700; text-decoration: none; text-align: center;">
                            📞 Ligar
                          </a>
                        </td>
                        <td style="padding-left: 8px;" width="50%">
                          <a href="mailto:${location.email}" style="display: block; padding: 16px 10px; background: #333; border: 1px solid #D4AF37; border-radius: 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 700; text-decoration: none; text-align: center;">
                            ✉️ Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cancellation Link -->
          <tr>
            <td style="padding: 0 50px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 14px;">
                <tr>
                  <td style="padding: 20px 30px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #888; font-size: 14px;">
                      Precisa cancelar? Pode fazê-lo até 2 horas antes da reserva.
                    </p>
                    <a href="${BASE_URL}/pt/cancelar-reserva" style="font-family: ${fontSans}; color: #D4AF37; font-size: 14px; text-decoration: underline;">
                      Cancelar Reserva
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 50px; background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%); text-align: center; border-top: 2px solid #D4AF37;">
              <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 28px; font-weight: 700;">Sushi in Sushi</p>
              <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #666; font-size: 18px;">A autêntica experiência japonesa no Porto</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍣</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🥢</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍱</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function getRestaurantNotificationEmail(reservation: Reservation) {
  const location = locationDetails[reservation.location];

  return {
    subject: `🔔 Nova Reserva - ${reservation.first_name} ${reservation.last_name} - ${formatDate(reservation.reservation_date)} ${reservation.reservation_time}`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Nova Reserva")}
<body style="margin: 0; padding: 20px; font-family: ${fontSans}; background-color: #f0f0f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background-color: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15);">

    <!-- Header -->
    <tr>
      <td style="padding: 40px 45px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); text-align: center;">
        <img src="${LOGO_URL}" alt="Sushi in Sushi" width="180" height="auto" style="display: block; margin: 0 auto 25px;" />
        <h1 style="margin: 0; font-family: ${fontSans}; font-size: 34px; color: #000; font-weight: 700; letter-spacing: 1px;">🔔 Nova Reserva Recebida</h1>
      </td>
    </tr>

    <!-- Quick Actions -->
    <tr>
      <td style="padding: 40px 45px 30px;">
        <p style="margin: 0 0 25px; text-align: center; font-family: ${fontSans}; color: #666; font-size: 22px;">Contactar cliente rapidamente:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 18px;">
                    <a href="tel:${reservation.phone.replace(/\s/g, "")}" style="display: block; padding: 24px 40px; font-family: ${fontSans}; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); color: #000; font-size: 24px; font-weight: 700; text-decoration: none; border-radius: 16px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);">
                      📞 Ligar Agora
                    </a>
                  </td>
                  <td style="padding-left: 18px;">
                    <a href="mailto:${reservation.email}" style="display: block; padding: 24px 40px; font-family: ${fontSans}; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: #D4AF37; font-size: 24px; font-weight: 700; text-decoration: none; border-radius: 16px; border: 2px solid #D4AF37;">
                      ✉️ Enviar Email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Date/Time Hero Section -->
    <tr>
      <td style="padding: 0 45px 35px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 20px; overflow: hidden; border: 2px solid #f59e0b;">
          <tr>
            <td style="padding: 35px; text-align: center;">
              <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #92400e; font-size: 18px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">📅 Data & Hora da Reserva</p>
              <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #78350f; font-size: 28px; font-weight: 700;">${formatDate(reservation.reservation_date)}</p>
              <p style="margin: 0; font-family: ${fontSans}; color: #b45309; font-size: 58px; font-weight: 700;">${reservation.reservation_time}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Customer Info Card -->
    <tr>
      <td style="padding: 0 45px 35px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 20px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 35px; background-color: #1f2937;">
              <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">👤 Informações do Cliente</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 0; border-bottom: 2px solid #e5e7eb;">
                    <span style="font-family: ${fontSans}; color: #6b7280; font-size: 18px; font-weight: 500;">Nome</span>
                    <p style="margin: 8px 0 0; font-family: ${fontSans}; color: #111827; font-size: 28px; font-weight: 700;">${reservation.first_name} ${reservation.last_name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; border-bottom: 2px solid #e5e7eb;">
                    <span style="font-family: ${fontSans}; color: #6b7280; font-size: 18px; font-weight: 500;">Telefone</span>
                    <p style="margin: 8px 0 0;">
                      <a href="tel:${reservation.phone.replace(/\s/g, "")}" style="font-family: ${fontSans}; color: #22c55e; font-size: 28px; font-weight: 700; text-decoration: none;">${reservation.phone}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0;">
                    <span style="font-family: ${fontSans}; color: #6b7280; font-size: 18px; font-weight: 500;">Email</span>
                    <p style="margin: 8px 0 0;">
                      <a href="mailto:${reservation.email}" style="font-family: ${fontSans}; color: #3b82f6; font-size: 24px; font-weight: 600; text-decoration: none;">${reservation.email}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Reservation Details -->
    <tr>
      <td style="padding: 0 45px 35px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 20px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 35px; background-color: #D4AF37;">
              <p style="margin: 0; font-family: ${fontSans}; color: #000; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">📋 Detalhes da Reserva</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <!-- Pessoas -->
                <tr>
                  <td style="padding: 18px 0; border-bottom: 2px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 55px;"><span style="font-size: 36px;">👥</span></td>
                        <td style="font-family: ${fontSans}; color: #6b7280; font-size: 22px;">Pessoas</td>
                        <td style="text-align: right; font-family: ${fontSans}; color: #111827; font-size: 32px; font-weight: 800;">${reservation.party_size}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Restaurante -->
                <tr>
                  <td style="padding: 18px 0; border-bottom: 2px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 55px;"><span style="font-size: 36px;">📍</span></td>
                        <td style="font-family: ${fontSans}; color: #6b7280; font-size: 22px;">Restaurante</td>
                        <td style="text-align: right; font-family: ${fontSans}; color: #111827; font-size: 24px; font-weight: 700;">${location.name.replace("Sushi in Sushi - ", "")}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Serviço -->
                <tr>
                  <td style="padding: 18px 0; border-bottom: 2px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 55px;"><span style="font-size: 36px;">🍣</span></td>
                        <td style="font-family: ${fontSans}; color: #6b7280; font-size: 22px;">Serviço</td>
                        <td style="text-align: right; font-family: ${fontSans}; color: #D4AF37; font-size: 26px; font-weight: 700;">${reservation.is_rodizio ? "Rodízio" : "À Carta"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${
                  reservation.occasion
                    ? `
                <!-- Ocasião -->
                <tr>
                  <td style="padding: 18px 0; border-bottom: 2px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 55px;"><span style="font-size: 36px;">🎉</span></td>
                        <td style="font-family: ${fontSans}; color: #6b7280; font-size: 22px;">Ocasião</td>
                        <td style="text-align: right; font-family: ${fontSans}; color: #111827; font-size: 24px; font-weight: 600;">${occasionLabels[reservation.occasion] || reservation.occasion}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ""
                }
                <!-- Marketing -->
                <tr>
                  <td style="padding: 18px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 55px;"><span style="font-size: 36px;">📧</span></td>
                        <td style="font-family: ${fontSans}; color: #6b7280; font-size: 22px;">Marketing</td>
                        <td style="text-align: right; font-family: ${fontSans}; color: #6b7280; font-size: 20px;">${reservation.marketing_consent ? "✅ Aceita novidades" : "❌ Não aceita"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${
      reservation.special_requests
        ? `
    <!-- Special Requests Alert -->
    <tr>
      <td style="padding: 0 45px 35px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 20px; overflow: hidden; border: 2px solid #ef4444;">
          <tr>
            <td style="padding: 30px 35px;">
              <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #dc2626; font-size: 24px; font-weight: 700;">⚠️ PEDIDOS ESPECIAIS</p>
              <p style="margin: 0; font-family: ${fontSans}; color: #7f1d1d; font-size: 24px; font-style: italic; line-height: 1.6;">"${reservation.special_requests}"</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `
        : ""
    }

    <!-- Action Required -->
    <tr>
      <td style="padding: 0 45px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 20px; overflow: hidden; border-left: 6px solid #f97316;">
          <tr>
            <td style="padding: 30px 35px;">
              <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #c2410c; font-size: 26px; font-weight: 700;">⏳ Ação Necessária</p>
              <p style="margin: 0; font-family: ${fontSans}; color: #9a3412; font-size: 22px; line-height: 1.6;">Confirmar disponibilidade e contactar o cliente para confirmar a reserva.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 30px 45px; background-color: #1f2937; text-align: center;">
        <p style="margin: 0; font-family: ${fontSans}; color: #D4AF37; font-size: 22px; font-weight: 600;">Sushi in Sushi</p>
        <p style="margin: 10px 0 0; font-family: ${fontSans}; color: #9ca3af; font-size: 16px;">Sistema de Gestão de Reservas</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function getReservationConfirmedEmail(reservation: Reservation) {
  const location = locationDetails[reservation.location];

  return {
    subject: `✅ Reserva Confirmada - ${formatDate(reservation.reservation_date)}`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Reserva Confirmada")}
<body style="margin: 0; padding: 0; font-family: ${fontSans}; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">

          <!-- Header with Success Badge -->
          <tr>
            <td style="padding: 55px 45px 45px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-bottom: 2px solid #22c55e;">
              <img src="${LOGO_URL}" alt="Sushi in Sushi" width="220" height="auto" style="display: block; margin: 0 auto 30px;" />
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50px; padding: 18px 40px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 24px; font-weight: 700; letter-spacing: 2px;">✅ RESERVA CONFIRMADA</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting Section -->
          <tr>
            <td style="padding: 50px 50px 40px;">
              <p style="margin: 0 0 24px; font-family: ${fontSans}; color: #fff; font-size: 36px; font-weight: 400;">
                Olá <strong style="font-weight: 700;">${reservation.first_name}</strong>! 🎉
              </p>
              <p style="margin: 0; font-family: ${fontSans}; color: #b0b0b0; font-size: 22px; line-height: 1.8;">
                A sua reserva foi <strong style="color: #22c55e;">confirmada</strong>! Estamos ansiosos por recebê-lo no nosso restaurante.
              </p>
            </td>
          </tr>

          <!-- Reservation Details Card -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%); border-radius: 20px; overflow: hidden; border: 2px solid #22c55e;">

                <!-- Date & Time -->
                <tr>
                  <td style="padding: 40px 35px; text-align: center; background: linear-gradient(135deg, #14532d 0%, #166534 100%);">
                    <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #86efac; font-size: 18px; text-transform: uppercase; letter-spacing: 3px;">A sua reserva</p>
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #fff; font-size: 32px; font-weight: 600;">${formatDate(reservation.reservation_date)}</p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #4ade80; font-size: 56px; font-weight: 700;">${reservation.reservation_time}</p>
                  </td>
                </tr>

                <!-- Details -->
                <tr>
                  <td style="padding: 35px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 20px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px;"><span style="font-size: 34px;">👥</span></td>
                              <td style="font-family: ${fontSans}; color: #888; font-size: 20px;">Pessoas</td>
                              <td style="text-align: right; font-family: ${fontSans}; color: #fff; font-size: 26px; font-weight: 700;">${reservation.party_size}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px;"><span style="font-size: 34px;">📍</span></td>
                              <td style="font-family: ${fontSans}; color: #888; font-size: 20px;">Local</td>
                              <td style="text-align: right; font-family: ${fontSans}; color: #fff; font-size: 22px; font-weight: 600;">${location.name}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px;"><span style="font-size: 34px;">🍣</span></td>
                              <td style="font-family: ${fontSans}; color: #888; font-size: 20px;">Serviço</td>
                              <td style="text-align: right; font-family: ${fontSans}; color: #D4AF37; font-size: 24px; font-weight: 700;">${reservation.is_rodizio ? "Rodízio" : "À Carta"}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location & Map Section -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <!-- Map Image -->
                <tr>
                  <td>
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; text-decoration: none;">
                      <img src="${getStaticMapUrl(location.coordinates.lat, location.coordinates.lng)}" alt="Mapa - ${location.name}" width="100%" style="display: block; width: 100%; height: auto; border-radius: 20px 20px 0 0;" />
                    </a>
                  </td>
                </tr>
                <!-- Open in Maps Button -->
                <tr>
                  <td style="padding: 0;">
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; padding: 18px 35px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); font-family: ${fontSans}; color: #fff; font-size: 20px; font-weight: 600; text-decoration: none; text-align: center;">
                      🗺️ Ver no Mapa → Obter Direções
                    </a>
                  </td>
                </tr>
                <!-- Address & Contact -->
                <tr>
                  <td style="padding: 30px 35px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #D4AF37; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${location.name.replace("Sushi in Sushi - ", "")}</p>
                    <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #fff; font-size: 20px; line-height: 1.5;">${location.address}</p>

                    <!-- Contact Buttons Row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right: 8px;" width="50%">
                          <a href="tel:${location.phone.replace(/\s/g, "")}" style="display: block; padding: 16px 10px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 12px; font-family: ${fontSans}; color: #000; font-size: 18px; font-weight: 700; text-decoration: none; text-align: center;">
                            📞 Ligar
                          </a>
                        </td>
                        <td style="padding-left: 8px;" width="50%">
                          <a href="mailto:${location.email}" style="display: block; padding: 16px 10px; background: #333; border: 1px solid #D4AF37; border-radius: 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 700; text-decoration: none; text-align: center;">
                            ✉️ Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 50px; background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%); text-align: center; border-top: 2px solid #D4AF37;">
              <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #D4AF37; font-size: 28px; font-weight: 700;">Até já!</p>
              <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #666; font-size: 18px;">Estamos ansiosos por recebê-lo</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍣</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🥢</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍱</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function getFarewellEmail(reservation: Reservation) {
  const location = locationDetails[reservation.location];

  return {
    subject: `🙏 Obrigado pela sua visita - Sushi in Sushi`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Obrigado pela sua visita")}
<body style="margin: 0; padding: 0; font-family: ${fontSans}; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">

          <!-- Header with Thank You Message -->
          <tr>
            <td style="padding: 60px 50px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-bottom: 2px solid #D4AF37;">
              <img src="${LOGO_URL}" alt="Sushi in Sushi" width="220" height="auto" style="display: block; margin: 0 auto 35px;" />
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 20px;">
                    <span style="font-size: 50px;">🙏</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 25px 0 0; font-family: ${fontSans}; color: #D4AF37; font-size: 42px; font-weight: 700; letter-spacing: 2px;">Obrigado!</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 55px 55px 45px;">
              <p style="margin: 0 0 28px; font-family: ${fontSans}; color: #fff; font-size: 36px; font-weight: 400; text-align: center;">
                Olá <strong style="font-weight: 700;">${reservation.first_name}</strong>! 💛
              </p>
              <p style="margin: 0 0 20px; font-family: ${fontSans}; color: #b0b0b0; font-size: 24px; line-height: 1.8; text-align: center;">
                Foi um prazer recebê-lo no <strong style="color: #D4AF37;">Sushi in Sushi</strong>!
              </p>
              <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 22px; line-height: 1.8; text-align: center;">
                Esperamos que a sua experiência tenha sido memorável e que tenha desfrutado dos nossos pratos. A sua opinião é muito importante para nós!
              </p>
            </td>
          </tr>

          <!-- Feedback Request Card -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%); border-radius: 20px; overflow: hidden; border: 1px solid #333;">
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <span style="font-size: 50px;">⭐</span>
                    <p style="margin: 20px 0 15px; font-family: ${fontSans}; color: #fff; font-size: 28px; font-weight: 600;">Gostou da experiência?</p>
                    <p style="margin: 0 0 30px; font-family: ${fontSans}; color: #888; font-size: 20px; line-height: 1.7;">
                      A sua avaliação ajuda-nos a melhorar e ajuda outros clientes a descobrir o nosso restaurante.
                    </p>

                    <!-- Google Review Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 16px;">
                          <a href="https://g.page/r/sushiinsushi/review" style="display: block; padding: 24px 50px; font-family: ${fontSans}; color: #000; font-size: 24px; font-weight: 700; text-decoration: none; text-align: center;">
                            ⭐ Deixar Avaliação no Google
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Visit Summary -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px 35px; border-bottom: 1px solid #333;">
                    <p style="margin: 0; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">📋 Resumo da sua visita</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 35px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="font-family: ${fontSans}; color: #888; font-size: 18px;">Data:</span>
                          <span style="float: right; font-family: ${fontSans}; color: #fff; font-size: 20px; font-weight: 600;">${formatDate(reservation.reservation_date)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #333;">
                          <span style="font-family: ${fontSans}; color: #888; font-size: 18px;">Restaurante:</span>
                          <span style="float: right; font-family: ${fontSans}; color: #fff; font-size: 20px; font-weight: 600;">${location.name.replace("Sushi in Sushi - ", "")}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #333;">
                          <span style="font-family: ${fontSans}; color: #888; font-size: 18px;">Serviço:</span>
                          <span style="float: right; font-family: ${fontSans}; color: #D4AF37; font-size: 20px; font-weight: 600;">${reservation.is_rodizio ? "Rodízio" : "À Carta"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Come Back Message -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #2d2510 0%, #3d3218 100%); border-radius: 20px; overflow: hidden; border: 1px dashed #D4AF37;">
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <span style="font-size: 45px;">🍣</span>
                    <p style="margin: 20px 0 15px; font-family: ${fontSans}; color: #D4AF37; font-size: 30px; font-weight: 700;">Volte sempre!</p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #ccc; font-size: 22px; line-height: 1.7;">
                      Estamos sempre a preparar novidades e experiências únicas para si. Esperamos vê-lo em breve!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location & Map for Next Visit -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <!-- Map Image -->
                <tr>
                  <td>
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; text-decoration: none;">
                      <img src="${getStaticMapUrl(location.coordinates.lat, location.coordinates.lng)}" alt="Mapa - ${location.name}" width="100%" style="display: block; width: 100%; height: auto; border-radius: 20px 20px 0 0;" />
                    </a>
                  </td>
                </tr>
                <!-- Open in Maps Button -->
                <tr>
                  <td style="padding: 0;">
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; padding: 16px 35px; background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); font-family: ${fontSans}; color: #fff; font-size: 18px; font-weight: 600; text-decoration: none; text-align: center;">
                      📍 Abrir no Google Maps
                    </a>
                  </td>
                </tr>
                <!-- Address & Contact -->
                <tr>
                  <td style="padding: 25px 35px; text-align: center;">
                    <p style="margin: 0 0 6px; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${location.name.replace("Sushi in Sushi - ", "")}</p>
                    <p style="margin: 0 0 20px; font-family: ${fontSans}; color: #fff; font-size: 18px;">${location.address}</p>

                    <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #666; font-size: 16px;">Para nova reserva:</p>

                    <!-- Contact Buttons Row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right: 8px;" width="50%">
                          <a href="tel:${location.phone.replace(/\s/g, "")}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 12px; font-family: ${fontSans}; color: #000; font-size: 16px; font-weight: 700; text-decoration: none; text-align: center;">
                            📞 Ligar
                          </a>
                        </td>
                        <td style="padding-left: 8px;" width="50%">
                          <a href="mailto:${location.email}" style="display: block; padding: 14px 10px; background: #333; border: 1px solid #D4AF37; border-radius: 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 16px; font-weight: 700; text-decoration: none; text-align: center;">
                            ✉️ Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Media -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1f1f1f; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 18px; font-family: ${fontSans}; color: #888; font-size: 18px;">Siga-nos nas redes sociais</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 12px;">
                          <a href="https://instagram.com/sushiinsushi" style="display: inline-block; font-size: 32px; text-decoration: none;">📸</a>
                        </td>
                        <td style="padding: 0 12px;">
                          <a href="https://facebook.com/sushiinsushi" style="display: inline-block; font-size: 32px; text-decoration: none;">👍</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 50px; background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%); text-align: center; border-top: 2px solid #D4AF37;">
              <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 28px; font-weight: 700;">Sushi in Sushi</p>
              <p style="margin: 0 0 20px; font-family: ${fontSans}; color: #666; font-size: 18px;">A autêntica experiência japonesa no Porto</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍣</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🥢</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍱</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">💛</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

// Rodízio waste policy section for reminder emails
function getRodizioWastePolicy(feePerPiece: number = 2.50): string {
  const formattedFee = feePerPiece.toFixed(2).replace('.', ',');
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px; background: linear-gradient(135deg, #2d2510 0%, #3d3218 100%); border-radius: 16px; border: 1px solid #D4AF37;">
      <tr>
        <td style="padding: 25px 30px;">
          <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #D4AF37; font-size: 20px; font-weight: 700;">
            🍣 Política Anti-Desperdício - Rodízio
          </p>
          <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #fff; font-size: 16px; line-height: 1.7;">
            No nosso sistema de Rodízio All You Can Eat, comprometemo-nos com a sustentabilidade e a redução do desperdício alimentar.
          </p>
          <ul style="margin: 15px 0; padding-left: 20px; font-family: ${fontSans}; color: #ccc; font-size: 15px; line-height: 1.8;">
            <li style="margin-bottom: 8px;">
              Faça os seus pedidos de forma consciente - pode sempre pedir mais!
            </li>
            <li style="margin-bottom: 8px;">
              Comida não consumida poderá ser cobrada: <strong style="color: #D4AF37;">${formattedFee}€ por peça de sushi</strong> deixada no prato
            </li>
            <li style="margin-bottom: 8px;">
              Esta política ajuda-nos a manter preços justos e a reduzir o impacto ambiental
            </li>
          </ul>
          <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 14px;">
            Obrigado pela sua compreensão e colaboração! 💚
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function getDayBeforeReminderEmail(reservation: Reservation, wasteFeePerPiece: number = 2.50) {
  const location = locationDetails[reservation.location];
  const rodizioSection = reservation.is_rodizio ? getRodizioWastePolicy(wasteFeePerPiece) : '';

  return {
    subject: `🍣 Lembrete: A sua reserva é amanhã! - ${formatDate(reservation.reservation_date)}`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Lembrete de Reserva")}
<body style="margin: 0; padding: 0; font-family: ${fontSans}; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">

          <!-- Header -->
          <tr>
            <td style="padding: 55px 45px 45px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-bottom: 2px solid #D4AF37;">
              <img src="${LOGO_URL}" alt="Sushi in Sushi" width="220" height="auto" style="display: block; margin: 0 auto 30px;" />
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 18px;">
                    <span style="color: #D4AF37; font-size: 32px;">⏰</span>
                  </td>
                  <td>
                    <p style="margin: 0; font-family: ${fontSans}; color: #D4AF37; font-size: 22px; letter-spacing: 5px; text-transform: uppercase; font-weight: 600;">Lembrete</p>
                  </td>
                  <td style="padding: 0 18px;">
                    <span style="color: #D4AF37; font-size: 32px;">⏰</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 50px 50px 40px;">
              <p style="margin: 0 0 24px; font-family: ${fontSans}; color: #fff; font-size: 36px; font-weight: 400;">
                Olá <strong style="font-weight: 700;">${reservation.first_name}</strong>! 👋
              </p>
              <p style="margin: 0; font-family: ${fontSans}; color: #b0b0b0; font-size: 22px; line-height: 1.8;">
                Queremos lembrar que a sua reserva no <strong style="color: #D4AF37;">Sushi in Sushi</strong> é <strong style="color: #fff;">amanhã</strong>! Estamos ansiosos por recebê-lo.
              </p>
            </td>
          </tr>

          <!-- Reservation Card -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%); border-radius: 20px; overflow: hidden; border: 1px solid #333;">

                <!-- Card Header -->
                <tr>
                  <td style="padding: 28px 35px; background: linear-gradient(90deg, #D4AF37 0%, #c9a432 100%); text-align: center;">
                    <p style="margin: 0; font-family: ${fontSans}; color: #000; font-size: 24px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">
                      📅 A sua Reserva
                    </p>
                  </td>
                </tr>

                <!-- Date & Time -->
                <tr>
                  <td style="padding: 40px 35px; text-align: center; border-bottom: 1px solid #333;">
                    <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #888; font-size: 18px; text-transform: uppercase; letter-spacing: 3px;">Amanhã</p>
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #fff; font-size: 32px; font-weight: 600;">${formatDate(reservation.reservation_date)}</p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #D4AF37; font-size: 56px; font-weight: 700;">${reservation.reservation_time}</p>
                  </td>
                </tr>

                <!-- Details -->
                <tr>
                  <td style="padding: 35px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 22px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px; vertical-align: middle;"><span style="font-size: 34px;">👥</span></td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Pessoas</p>
                                <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #fff; font-size: 26px; font-weight: 700;">${reservation.party_size} pessoa${reservation.party_size > 1 ? 's' : ''}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 22px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px; vertical-align: middle;"><span style="font-size: 34px;">📍</span></td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Restaurante</p>
                                <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #fff; font-size: 24px; font-weight: 600;">${location.name}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 22px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 55px; vertical-align: middle;"><span style="font-size: 34px;">🍣</span></td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 17px; text-transform: uppercase; letter-spacing: 2px;">Serviço</p>
                                <p style="margin: 6px 0 0; font-family: ${fontSans}; color: #D4AF37; font-size: 26px; font-weight: 700;">${reservation.is_rodizio ? "Rodízio All You Can Eat" : "À Carta"}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${rodizioSection}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location & Map -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <tr>
                  <td>
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; text-decoration: none;">
                      <img src="${getStaticMapUrl(location.coordinates.lat, location.coordinates.lng)}" alt="Mapa - ${location.name}" width="100%" style="display: block; width: 100%; height: auto; border-radius: 20px 20px 0 0;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; padding: 18px 35px; background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); font-family: ${fontSans}; color: #fff; font-size: 20px; font-weight: 600; text-decoration: none; text-align: center;">
                      📍 Abrir no Google Maps → Obter Direções
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 35px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #D4AF37; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${location.name.replace("Sushi in Sushi - ", "")}</p>
                    <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #fff; font-size: 20px; line-height: 1.5;">${location.address}</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right: 8px;" width="50%">
                          <a href="tel:${location.phone.replace(/\s/g, "")}" style="display: block; padding: 16px 10px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 12px; font-family: ${fontSans}; color: #000; font-size: 18px; font-weight: 700; text-decoration: none; text-align: center;">
                            📞 Ligar
                          </a>
                        </td>
                        <td style="padding-left: 8px;" width="50%">
                          <a href="mailto:${location.email}" style="display: block; padding: 16px 10px; background: #333; border: 1px solid #D4AF37; border-radius: 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 700; text-decoration: none; text-align: center;">
                            ✉️ Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Info Note -->
          <tr>
            <td style="padding: 0 50px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1f1f1f; border-radius: 14px; border: 1px dashed #444;">
                <tr>
                  <td style="padding: 25px 30px; text-align: center;">
                    <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #888; font-size: 20px; line-height: 1.7;">
                      ℹ️ Precisa de <strong style="color: #fff;">cancelar</strong>? Pode fazê-lo online até <strong style="color: #fff;">2 horas antes</strong> da reserva.
                    </p>
                    <a href="${BASE_URL}/pt/cancelar-reserva" style="font-family: ${fontSans}; color: #D4AF37; font-size: 16px; text-decoration: underline;">
                      Cancelar Reserva
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 50px; background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%); text-align: center; border-top: 2px solid #D4AF37;">
              <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 28px; font-weight: 700;">Até amanhã!</p>
              <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #666; font-size: 18px;">Sushi in Sushi - A autêntica experiência japonesa</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍣</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🥢</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍱</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function getSameDayReminderEmail(reservation: Reservation, wasteFeePerPiece: number = 2.50) {
  const location = locationDetails[reservation.location];
  const rodizioSection = reservation.is_rodizio ? getRodizioWastePolicy(wasteFeePerPiece) : '';

  return {
    subject: `⏰ Daqui a 2 horas! A sua reserva no Sushi in Sushi`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Lembrete - Daqui a 2 horas")}
<body style="margin: 0; padding: 0; font-family: ${fontSans}; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">

          <!-- Header with Urgent Badge -->
          <tr>
            <td style="padding: 55px 45px 45px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-bottom: 2px solid #f59e0b;">
              <img src="${LOGO_URL}" alt="Sushi in Sushi" width="220" height="auto" style="display: block; margin: 0 auto 30px;" />
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50px; padding: 18px 40px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-family: ${fontSans}; color: #000; font-size: 24px; font-weight: 700; letter-spacing: 2px;">⏰ DAQUI A 2 HORAS!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 50px 50px 40px;">
              <p style="margin: 0 0 24px; font-family: ${fontSans}; color: #fff; font-size: 36px; font-weight: 400;">
                Olá <strong style="font-weight: 700;">${reservation.first_name}</strong>! 🎉
              </p>
              <p style="margin: 0; font-family: ${fontSans}; color: #b0b0b0; font-size: 22px; line-height: 1.8;">
                A sua experiência gastronómica no <strong style="color: #D4AF37;">Sushi in Sushi</strong> começa em breve! Não se atrase - a mesa está reservada para si.
              </p>
            </td>
          </tr>

          <!-- Countdown Card -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #451a03 0%, #78350f 100%); border-radius: 20px; overflow: hidden; border: 2px solid #f59e0b;">
                <tr>
                  <td style="padding: 40px 35px; text-align: center;">
                    <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #fed7aa; font-size: 18px; text-transform: uppercase; letter-spacing: 3px;">A sua reserva é às</p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 72px; font-weight: 700;">${reservation.reservation_time}</p>
                    <p style="margin: 20px 0 0; font-family: ${fontSans}; color: #fbbf24; font-size: 24px; font-weight: 600;">${formatDate(reservation.reservation_date)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Details -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%); border-radius: 20px; overflow: hidden; border: 1px solid #333;">
                <tr>
                  <td style="padding: 35px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 50px;"><span style="font-size: 30px;">👥</span></td>
                              <td style="font-family: ${fontSans}; color: #888; font-size: 18px;">Pessoas</td>
                              <td style="text-align: right; font-family: ${fontSans}; color: #fff; font-size: 24px; font-weight: 700;">${reservation.party_size}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #333;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 50px;"><span style="font-size: 30px;">📍</span></td>
                              <td style="font-family: ${fontSans}; color: #888; font-size: 18px;">Local</td>
                              <td style="text-align: right; font-family: ${fontSans}; color: #fff; font-size: 20px; font-weight: 600;">${location.name.replace("Sushi in Sushi - ", "")}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 50px;"><span style="font-size: 30px;">🍣</span></td>
                              <td style="font-family: ${fontSans}; color: #888; font-size: 18px;">Serviço</td>
                              <td style="text-align: right; font-family: ${fontSans}; color: #D4AF37; font-size: 22px; font-weight: 700;">${reservation.is_rodizio ? "Rodízio" : "À Carta"}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${rodizioSection}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Get Directions CTA -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <a href="${location.mapsUrl}" target="_blank" style="display: block; padding: 24px 40px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 16px; font-family: ${fontSans}; color: #000; font-size: 24px; font-weight: 700; text-decoration: none; text-align: center;">
                🗺️ Obter Direções no Google Maps
              </a>
            </td>
          </tr>

          <!-- Address Quick Info -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px 30px; text-align: center;">
                    <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 700;">${location.name}</p>
                    <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #fff; font-size: 18px;">${location.address}</p>
                    <a href="tel:${location.phone.replace(/\s/g, "")}" style="font-family: ${fontSans}; color: #22c55e; font-size: 20px; font-weight: 600; text-decoration: none;">📞 ${location.phone}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cancellation Note -->
          <tr>
            <td style="padding: 0 50px 30px;">
              <p style="margin: 0; font-family: ${fontSans}; color: #888; font-size: 14px; text-align: center; line-height: 1.6;">
                Precisa cancelar? O prazo para cancelamento online está a terminar. <a href="${BASE_URL}/pt/cancelar-reserva" style="color: #D4AF37; text-decoration: underline;">Cancelar agora</a> ou contacte-nos diretamente.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 50px; background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%); text-align: center; border-top: 2px solid #D4AF37;">
              <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 28px; font-weight: 700;">Até já!</p>
              <p style="margin: 0 0 25px; font-family: ${fontSans}; color: #666; font-size: 18px;">Estamos ansiosos por recebê-lo</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍣</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🥢</span></td>
                  <td style="padding: 0 10px;"><span style="font-size: 28px;">🍱</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function getCancellationEmail(reservation: Reservation, cancellationReason: string) {
  const location = locationDetails[reservation.location];

  return {
    subject: `Reserva Cancelada - ${formatDate(reservation.reservation_date)}`,
    html: `
<!DOCTYPE html>
<html>
${getEmailHead("Reserva Cancelada")}
<body style="margin: 0; padding: 0; font-family: ${fontSans}; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 55px 45px 45px; text-align: center; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border-bottom: 2px solid #8B0000;">
              <img src="${LOGO_URL}" alt="Sushi in Sushi" width="220" height="auto" style="display: block; margin: 0 auto 30px;" />
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 18px;">
                    <span style="color: #8B0000; font-size: 32px;">✦</span>
                  </td>
                  <td>
                    <p style="margin: 0; font-family: ${fontSans}; color: #8B0000; font-size: 22px; letter-spacing: 5px; text-transform: uppercase; font-weight: 600;">Reserva Cancelada</p>
                  </td>
                  <td style="padding: 0 18px;">
                    <span style="color: #8B0000; font-size: 32px;">✦</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Apology Message -->
          <tr>
            <td style="padding: 50px 50px 35px;">
              <p style="margin: 0 0 10px; font-family: ${fontSans}; color: #fff; font-size: 26px; font-weight: 700;">
                Caro(a) ${reservation.first_name},
              </p>
              <p style="margin: 0; font-family: ${fontSans}; color: #999; font-size: 20px; line-height: 1.6;">
                Lamentamos profundamente informar que a sua reserva foi cancelada. Pedimos sinceras desculpas pelo incómodo causado.
              </p>
            </td>
          </tr>

          <!-- Cancellation Reason -->
          <tr>
            <td style="padding: 0 50px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #2d1a1a 0%, #1f1212 100%); border-radius: 20px; border: 1px solid #8B0000;">
                <tr>
                  <td style="padding: 30px 35px;">
                    <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #8B0000; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                      Motivo do Cancelamento
                    </p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 18px; line-height: 1.6;">
                      ${cancellationReason}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Original Reservation Details -->
          <tr>
            <td style="padding: 0 50px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px 35px;">
                    <p style="margin: 0 0 20px; font-family: ${fontSans}; color: #666; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                      Detalhes da Reserva Cancelada
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding: 12px 0; border-bottom: 1px solid #333;">
                          <p style="margin: 0 0 4px; font-family: ${fontSans}; color: #888; font-size: 14px;">Data</p>
                          <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 18px; font-weight: 600;">${formatDate(reservation.reservation_date)}</p>
                        </td>
                        <td width="50%" style="padding: 12px 0; border-bottom: 1px solid #333;">
                          <p style="margin: 0 0 4px; font-family: ${fontSans}; color: #888; font-size: 14px;">Hora</p>
                          <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 18px; font-weight: 600;">${reservation.reservation_time.slice(0, 5)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 12px 0;">
                          <p style="margin: 0 0 4px; font-family: ${fontSans}; color: #888; font-size: 14px;">Pessoas</p>
                          <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 18px; font-weight: 600;">${reservation.party_size} pessoa${reservation.party_size > 1 ? "s" : ""}</p>
                        </td>
                        <td width="50%" style="padding: 12px 0;">
                          <p style="margin: 0 0 4px; font-family: ${fontSans}; color: #888; font-size: 14px;">Localização</p>
                          <p style="margin: 0; font-family: ${fontSans}; color: #fff; font-size: 18px; font-weight: 600;">${location.name.replace("Sushi in Sushi - ", "")}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invitation to Rebook -->
          <tr>
            <td style="padding: 0 50px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1f2a1f 0%, #152015 100%); border-radius: 20px; border: 1px solid #D4AF37;">
                <tr>
                  <td style="padding: 30px 35px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: ${fontSans}; color: #D4AF37; font-size: 22px; font-weight: 700;">
                      Gostaríamos de o receber novamente!
                    </p>
                    <p style="margin: 0; font-family: ${fontSans}; color: #999; font-size: 18px;">
                      Teremos todo o prazer em recebê-lo(a) noutra data
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location & Map for New Booking -->
          <tr>
            <td style="padding: 0 50px 45px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #252525; border-radius: 20px; overflow: hidden;">
                <!-- Map Image -->
                <tr>
                  <td>
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; text-decoration: none;">
                      <img src="${getStaticMapUrl(location.coordinates.lat, location.coordinates.lng)}" alt="Mapa - ${location.name}" width="100%" style="display: block; width: 100%; height: auto; border-radius: 20px 20px 0 0;" />
                    </a>
                  </td>
                </tr>
                <!-- Open in Maps Button -->
                <tr>
                  <td style="padding: 0;">
                    <a href="${location.mapsUrl}" target="_blank" style="display: block; padding: 16px 35px; background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); font-family: ${fontSans}; color: #fff; font-size: 18px; font-weight: 600; text-decoration: none; text-align: center;">
                      Abrir no Google Maps
                    </a>
                  </td>
                </tr>
                <!-- Address & Contact -->
                <tr>
                  <td style="padding: 25px 35px; text-align: center;">
                    <p style="margin: 0 0 6px; font-family: ${fontSans}; color: #D4AF37; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${location.name.replace("Sushi in Sushi - ", "")}</p>
                    <p style="margin: 0 0 20px; font-family: ${fontSans}; color: #fff; font-size: 18px;">${location.address}</p>

                    <p style="margin: 0 0 15px; font-family: ${fontSans}; color: #666; font-size: 16px;">Para nova reserva:</p>

                    <!-- Contact Buttons Row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right: 8px;" width="50%">
                          <a href="tel:${location.phone.replace(/\s/g, "")}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%); border-radius: 12px; font-family: ${fontSans}; color: #000; font-size: 16px; font-weight: 700; text-decoration: none; text-align: center;">
                            Ligar
                          </a>
                        </td>
                        <td style="padding-left: 8px;" width="50%">
                          <a href="mailto:${location.email}" style="display: block; padding: 14px 10px; background: #333; border: 1px solid #D4AF37; border-radius: 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 16px; font-weight: 700; text-decoration: none; text-align: center;">
                            Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Media -->
          <tr>
            <td style="padding: 0 50px 50px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1f1f1f; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 18px; font-family: ${fontSans}; color: #888; font-size: 18px;">Siga-nos nas redes sociais</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 12px;">
                          <a href="https://instagram.com/sushiinsushi" style="font-family: ${fontSans}; color: #D4AF37; font-size: 16px; text-decoration: none;">Instagram</a>
                        </td>
                        <td style="padding: 0 12px;">
                          <a href="https://facebook.com/sushiinsushi" style="font-family: ${fontSans}; color: #D4AF37; font-size: 16px; text-decoration: none;">Facebook</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 50px; background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%); text-align: center; border-top: 2px solid #D4AF37;">
              <p style="margin: 0 0 12px; font-family: ${fontSans}; color: #D4AF37; font-size: 28px; font-weight: 700;">Sushi in Sushi</p>
              <p style="margin: 0 0 20px; font-family: ${fontSans}; color: #666; font-size: 18px;">A autêntica experiência japonesa no Porto</p>
              <p style="margin: 0; font-family: ${fontSans}; color: #555; font-size: 14px;">Pedimos novamente desculpa pelo transtorno.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}
