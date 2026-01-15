export const blogTemplate = (data, type = "blog", unsubscribeToken) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MusafirBaba Newsletter</title>
</head>

<body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:#87e87f;padding:20px;text-align:center;">
      <img src="https://cdn.musafirbaba.com/images/logo.png"
        alt="MusafirBaba Logo" style="max-width:180px;" />
    </div>

    <!-- Featured -->
    <div style="padding:30px;text-align:center;">
      <img src="${data[0].coverImage.url}"
        alt="${data[0].coverImage.alt}"
        style="max-width:100%;border-radius:10px;" />

      <h1 style="color:#FE5300;">${data[0].title}</h1>
      <p>${data[0].excerpt}</p>

      <a href="https://musafirbaba.com/${type}/${data[0].slug}">
        <button style="padding:10px 20px;background:#FE5300;color:#fff;border:none;">
          Read Full Article
        </button>
      </a>
    </div>

  <!-- Other Articles -->
${data
  .slice(1)
  .map(
    (item) => `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border-top:1px solid #eee;padding:15px 0;">
    <tr>
      <!-- Image -->
      <td width="120" valign="top" style="padding-right:15px;">
        <a href="https://musafirbaba.com/${type}/${item.slug}">
          <img
            src="${item.coverImage.url}"
            alt="${item.coverImage.alt}"
            width="120"
            style="display:block;border-radius:6px;"
          />
        </a>
      </td>

      <!-- Content -->
      <td valign="top" style="text-align:left;">
        <a href="https://musafirbaba.com/${type}/${item.slug}"
          style="text-decoration:none;color:#000;">
          <h3 style="margin:0 0 6px 0;font-size:16px;line-height:1.3;">
            ${item.title}
          </h3>
        </a>

        <p style="margin:0;font-size:13px;line-height:1.5;color:#555;">
          ${item.excerpt}
        </p>
      </td>
    </tr>
  </table>
`
  )
  .join("")}
         <!-- Footer -->
      <div style="background-color:#f0f0f0;padding:40px;text-align:center;font-size:13px;line-height:1.8;color:#666;">
        <div style="margin-bottom:25px;">
          You are receiving this email because you registered at MusafirBaba.com. If this doesn’t apply to you, please ignore this message.
        </div>

        <!-- Footer Links -->
<table role="presentation" align="center" style="margin:auto;">
  <tr>
    <td style="padding:0 10px;">
      <a href="https://musafirbaba.com/" style="color:#7c2ae8;text-decoration:none;font-weight:600;">MusafirBaba.com</a>
    </td>
    <td style="padding:0 10px;">
      <a href="https://musafirbaba.com/about-us" style="color:#7c2ae8;text-decoration:none;font-weight:600;">About Us</a>
    </td>
    <td style="padding:0 10px;">
      <a href="https://musafirbaba.com/holidays" style="color:#7c2ae8;text-decoration:none;font-weight:600;">Holidays</a>
    </td>
    <td style="padding:0 10px;">
      <a href="https://musafirbaba.com/visa" style="color:#7c2ae8;text-decoration:none;font-weight:600;">Visa</a>
    </td>
  </tr>
</table>


        <div style="margin:25px 0;font-size:13px;line-height:1.7;color:#666;">
          MusafirBaba, a trusted name in the travel industry in Delhi. We offer expertly crafted customised tour packages, group bike tours, family vacations, and more, along with visa assistance and travel bookings.
        </div>

        <div style="margin:40px 0 30px 0;">
          <h3 style="color:#7c2ae8;font-size:18px;margin-bottom:15px;">Get in touch</h3>
          <div style="font-size:13px;margin-bottom:15px;line-height:1.8;color:#555;">
            <div>MusafirBaba Pvt. Ltd.</div>
            <div>1st Floor, Khaira More, Metro Station, Plot No. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi</div>
            <div>Delhi, 110043 (India)</div>
          </div>
          <a href="mailto:care@musafirbaba.com" style="color:#7c2ae8;text-decoration:none;font-weight:600;">care@musafirbaba.com</a>
        </div>

        <!-- Social Icons -->
        <!-- Social Icons -->
<table role="presentation" align="center" style="margin:20px auto;">
  <tr>
    <td style="padding:0 8px;">
      <a href="https://in.linkedin.com/company/musafirbaba">
        <img src="https://cdn.musafirbaba.com/images/linkedin_l5gfr5.png" alt="LinkedIn" style="width:30px;height:30px;display:block;" />
      </a>
    </td>
    <td style="padding:0 8px;">
      <a href="https://x.com/itsmusafirbaba">
        <img src="https://cdn.musafirbaba.com/images/twitter_hs5c2t.png" alt="Twitter" style="width:30px;height:30px;display:block;" />
      </a>
    </td>
    <td style="padding:0 8px;">
      <a href="https://www.instagram.com/hello_musafirbaba">
        <img src="https://cdn.musafirbaba.com/images/instagram_p9vxol.png" alt="Instagram" style="width:30px;height:30px;display:block;" />
      </a>
    </td>
    <td style="padding:0 8px;">
      <a href="https://www.facebook.com/hellomusafirbaba">
        <img src="https://cdn.musafirbaba.com/images/facebook_ednwce.png" alt="Facebook" style="width:30px;height:30px;display:block;" />
      </a>
    </td>
  </tr>
</table>
<div style="margin-top:25px;font-size:12px;color:#666;">
  Don’t want to receive these emails?
  <a
    href="https://musafirbaba.com/unsubscribe?token=${unsubscribeToken}"
    style="color:#FE5300;text-decoration:underline;"
  >
    Unsubscribe
  </a>
</div>


        <div style="margin-top:20px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#999;">
          Copyright © MusafirBaba. All rights reserved.
        </div>
      </div>
    </div>

  </div>
</body>
</html>
`;
