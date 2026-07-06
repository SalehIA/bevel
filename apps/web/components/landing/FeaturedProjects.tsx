import { getFeaturedProjects } from "@/lib/landing/featured-projects";
import ProjectShowcase from "./ProjectShowcase";

export default function FeaturedProjects() {
  const projects = getFeaturedProjects(4);
  return <ProjectShowcase projects={projects} />;
}
