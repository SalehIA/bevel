import AboutSection from "./AboutSection";
import ContactIntro from "./ContactIntro";
import FeaturedProjects from "./FeaturedProjects";
import HeroSection from "./HeroSection";
import LandingFooter from "./LandingFooter";
import LandingHeader from "./LandingHeader";
import RegistrationSection from "./RegistrationSection";
import ServicesSection from "./ServicesSection";

type Props = {
  autoOpenRegister?: boolean;
};

export default function LandingPage({ autoOpenRegister }: Props) {
  return (
    <div>
      <LandingHeader />
      <HeroSection />
      <AboutSection />
      <FeaturedProjects />
      <ServicesSection />
      <ContactIntro>
        <RegistrationSection embedded autoOpen={autoOpenRegister} />
      </ContactIntro>
      <LandingFooter />
    </div>
  );
}
