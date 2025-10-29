export const verifyEmailTemplate = (name, otp) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Email Address - MusafirBaba</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;color:#333;">
    <!-- Header -->
    <div style="background-color:#87e87f;padding:20px;text-align:center;border-bottom:3px solid #fff;">
      <img src="https://res.cloudinary.com/dmmsemrty/image/upload/v1761729747/logo_eoh3ey.svg" alt="MusafirBaba Logo" style="max-width:180px;height:auto;" />
    </div>

    <!-- Hero Section -->
    <div style="background:#87e87f;padding:60px 20px;text-align:center;">
      <img src="https://res.cloudinary.com/dmmsemrty/image/upload/v1761729585/verify-email-musafir-baba_sanwav.png" alt="Verify Email Illustration" style="max-width:300px;height:auto;" />
    </div>

    <!-- Main Container -->
    <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
      <div style="padding:50px 40px;text-align:center;">
        <h1 style="font-size:32px;font-weight:700;margin-bottom:30px;color:#FE5300;">
          Verify Email <span style="color:#87e87f;">Address</span>
        </h1>

        <div style="font-size:16px;font-weight:600;text-align:left;margin-bottom:20px;color:#000;">
          Hello ${name},
        </div>

        <p style="font-size:14px;line-height:1.6;text-align:left;margin-bottom:30px;color:#555;">
          Please copy the OTP below to validate your email address so you can use all features of MusafirBaba.com.
        </p>

        <!-- OTP Section -->
        <div style="margin-bottom:30px;text-align:center;">
          <div style="margin-bottom:10px;">
            <input type="text" value="${otp}" readonly
              style="width:100%;padding:12px 15px;border:1px solid #ddd;font-size:16px;background-color:#f9f9f9;text-align:center;font-weight:bold;color:#333;"
            />
          </div>
          <div style="font-size:12px;color:#999;">Copy and paste the OTP</div>
        </div>

        <!-- Sign-off -->
        <div style="text-align:left;font-size:14px;line-height:1.8;color:#333;">
          <div style="margin-bottom:5px;">Thank you,</div>
          <div style="font-weight:600;">Team MusafirBaba</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color:#f0f0f0;padding:40px;text-align:center;font-size:13px;line-height:1.8;color:#666;">
        <div style="margin-bottom:25px;">
          You are receiving this email because you registered at MusafirBaba.com. If this doesn’t apply to you, please ignore this message.
        </div>

        <div style="margin:25px 0;display:flex;justify-content:center;gap:20px;flex-wrap:wrap;">
          <a href="https://musafirbaba.com/" style="color:#7c2ae8;text-decoration:none;font-weight:600;">MusafirBaba.com</a>
          <a href="https://musafirbaba.com/about-us" style="color:#7c2ae8;text-decoration:none;font-weight:600;">About Us</a>
          <a href="https://musafirbaba.com/holidays" style="color:#7c2ae8;text-decoration:none;font-weight:600;">Holidays</a>
          <a href="https://musafirbaba.com/visa" style="color:#7c2ae8;text-decoration:none;font-weight:600;">Visa</a>
        </div>

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
        <div style="display:flex;justify-content:center;gap:15px;margin:20px 0;">
          <a href="https://in.linkedin.com/company/musafirbaba"><img src="https://res.cloudinary.com/dmmsemrty/image/upload/v1761732014/linkedin_l5gfr5.png" alt="LinkedIn" style="width:30px;height:30px;" /></a>
          <a href="https://x.com/itsmusafirbaba"><img src="https://res.cloudinary.com/dmmsemrty/image/upload/v1761732014/twitter_hs5c2t.png" alt="Twitter" style="width:30px;height:30px;" /></a>
          <a href="https://www.instagram.com/hello_musafirbaba"><img src="https://res.cloudinary.com/dmmsemrty/image/upload/v1761732015/instagram_p9vxol.png" alt="Instagram" style="width:30px;height:30px;" /></a>
          <a href="https://www.facebook.com/hellomusafirbaba"><img src="https://res.cloudinary.com/dmmsemrty/image/upload/v1761732015/facebook_ednwce.png" alt="Facebook" style="width:30px;height:30px;" /></a>
        </div>

        <div style="margin-top:20px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#999;">
          Copyright © MusafirBaba. All rights reserved.
        </div>
      </div>
    </div>
  </body>
</html>`;
