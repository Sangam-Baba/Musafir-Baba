import Hero from "@/components/custom/Hero"
import { Metadata } from "next"
export const metadata: Metadata = {
  title: "Privacy Policy | Your Data, Our Responsibility",
  description:
    "Our privacy policy explains travel data protection practices.",
  alternates: {
    canonical: "https://www.musafirbaba.com/privacy-policy",
  },
}

function PrivacyPolicy() {
  return (
    <section >
        <Hero image="/Heroimg.jpg" title="Privacy Policy" />
        <div className="container lg:max-w-7xl  mx-auto py-10 px-8">
            <div>
             <h1 className="text-3xl font-bold mb-4">
                Privacy Policy
             </h1>
             <div className="w-20 h-1 bg-[#FE5300]"></div>
            </div>
            <div className="mt-8">
                <p>{`Musafirbaba Travels Pvt Ltd, also known as "Musafirbaba," owns this website. In this site, the words "Musafirbaba Travels Pvt Ltd" and "Musafirbaba" are used interchangeably. Musafirbaba wants to protect the personal information you submit to us. This Privacy Statement is intended to inform you of our procedures regarding the collection, use, and disclosure of information that you may give through this website. 

Before using or contributing information to this site, please read our full Privacy Policy. Your use of this site signifies that you agree to our Privacy Policy. You agree to the terms of this Privacy Statement by using this website. When you submit information through this site, you consent to its collection, use, and dissemination in accordance with this Privacy Policy.`}</p>
<p className="font-bold mt-4 mb-4">Copyright</p>
<p>{`
Copyright and other intellectual property laws protect any information displayed, communicated, or carried on www.musafirbaba.com. Under no circumstances may you edit, publish, distribute, repost, perform, display, or otherwise commercially exploit any of the content on this website.`}</p>
<p className="font-bold mt-4 mb-4">What do we collect? </p>
<p>{`
This site, like many others, actively gathers information from its visitors by allowing you to connect directly with us via e-mail and feedback forms. Some of the information you provide may be personally identifiable (that is, information that can be uniquely identified with you, such as your full name, address, e-mail address, phone number, and so on). Some parts of this site may ask you to submit information in order to take use of the features listed (such as newsletter subscriptions, order processing, and submitting a resume). 

Certain information can be passively collected (that is, obtained without your actively supplying the information) while you travel across the Web site utilizing different technologies and techniques, such as navigational data collecting. Internet Protocol (IP) addresses may be used on this site. An IP address is a number that your Internet service provider assigns to your computer to connect you from the Internet. It is generally regarded as non-personally identifiable information because, in most cases, an IP address is dynamic (changing each time you connect to the Internet) rather than static (unique to a specific user's computer). We may use your IP address to diagnose server problems, provide aggregate data, identify the quickest path for your computer to use while connecting to our site, and manage and enhance the site.`}</p>

<p className="font-bold mt-4 mb-4">How do we use the collected data?</p>

<p>We need your information to better understand your needs and offer you with better service, namely for the following reasons:</p>

<p className="font-bold mt-4 mb-4">Keeping internal records.</p>
<p>{`The information may be used to enhance our goods and services.
Using the email address you have given, we may send you promotional emails about new goods, special deals, or other information that we believe you will find interesting.

We may also use your information to contact you for market research reasons from time to time. We may reach out to you through email, phone, fax, or mail. We may use the information to tailor the website to your preferences.
Security

We are committed to keeping your information safe. We have put in place appropriate physical, technical, and administrative processes to protect and secure the information we collect online in order to prevent unauthorized access or disclosure. No data transfer over the internet, however, can be guaranteed to be completely safe. As a result, while we make every effort to safeguard your personal information, we cannot guarantee or assure the security of any information you submit to us on the internet, as you are doing it so, at your own risk. Once we get your transmission, we will make every attempt to secure it on our systems.`}</p>

<p className="font-bold mt-4 mb-4">How do we utilize cookies?</p>

<p>{`A cookie is a tiny file that requests permission to be placed on the hard disc of your computer. Once you accept, the file is added, and the cookie assists us in analyzing online traffic or notifies you when you visit a specific site. Cookies enable online programs to provide access or respond to you as a unique visitor or user. By acquiring and retaining information about your preferences, the web application can customize its operations to your requirements, likes, and dislikes.

We employ traffic log cookies to see the visited pages. This allows us to evaluate data about website traffic and develop our website to better meet the requirements of our customers. We just utilize this information for statistical analysis and subsequently delete it from the system.

Overall, cookies assist us in providing a better website by allowing us to track which pages you find beneficial and which you do not. These cookies do not provide us any access to your PC or steal personal information about you, other than the information you choose to share with us.

You can either accept or refuse our cookies. Most web browsers allow cookies by default; however, you can generally change your browser settings to refuse cookies if you prefer, but it may prohibit you from fully utilizing the website and its pages.`}</p>

<p className="font-bold mt-4 mb-4">Links from other websites</p>

Our website may have few useful links, URLs or connections to other websites that may be useful for you. However, if you visit these links while leaving our site, please keep in mind that we have no control over the other website. As a result, we cannot be held liable for the security or privacy of any information you submit when visiting other sites, and such sites are not covered by this privacy statement. So, you should be careful while reviewing the privacy policy for the website in question.

<p className="font-bold mt-4 mb-4">Controlling your personal data</p>

<p>{`You can limit the gathering and use of your personal information in the following ways:

When filling out a form on the website, check for the box that allows you to declare that you do not want the information to be used for direct marketing reasons.
If you previously consented to us processing your personal information for direct marketing purposes, you may withdraw your consent at any time by writing to or emailing us at care@musafirbaba.com.

We will not sell, distribute, or lease your personal information to other parties unless you give us permission, or it is required by law. If you tell us that you want us to, we may use your personal information to send you promotional material about third parties that we believe you would be interested in.

Under the Data Protection Act of 1998, you have the right to request access to personal information that we have on file for you. A modest fee will be charged. Please write to 1st Floor Plot No. 1, near Metro Pillar Number 782, Dwarka Mor, New Delhi, Delhi 110059 if you would like a copy of the information stored on you.
If you feel that any information we have on file for you is wrong or incomplete, please contact us as soon as possible at`} <span className="font-semibold text-[#FE5300]"> care@musafirbaba.com </span> {`or at the aforementioned address. Any erroneous information will be corrected as soon as possible.
Get in Touch

If you have any concerns about our privacy statement, please contact us by using the "Contact Us" link on the navigation tab.`}</p>

<p className="font-bold mt-4 mb-4">Policy Modifications</p>

<p>{`Any modifications to this Policy will be disclosed on this website. Please return on a regular basis, and especially before providing any personally sensitive information.
`}</p>
            </div> 
        </div>
    </section>
  )
}

export default PrivacyPolicy