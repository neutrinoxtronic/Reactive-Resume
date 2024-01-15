import { t } from "@lingui/macro";
import { ResumeDto } from "@reactive-resume/dto";
import { cn, getValidSectionValue } from "@reactive-resume/utils";
import { useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { LoaderFunction, redirect, useParams } from "react-router-dom";

import { queryClient } from "@/client/libs/query-client";
import { findResumeById } from "@/client/services/resume";
import { useBuilderStore } from "@/client/stores/builder";
import { useResumeStore } from "@/client/stores/resume";

export const BuilderPage = () => {
  const params = useParams<{ id: string; section: string }>();
  const frameRef = useBuilderStore((state) => state.frame.ref);
  const activeSection = useBuilderStore((state) => state.activeSection);
  const setFrameRef = useBuilderStore((state) => state.frame.setRef);

  const resume = useResumeStore((state) => state.resume);
  const title = useResumeStore((state) => state.resume.title);

  // Is Simple editor opened
  const isSimpleEditor = !!params.section;

  const updateResumeInFrame = useCallback(() => {
    if (!frameRef || !frameRef.contentWindow) return;
    const message = { type: "SET_RESUME", payload: resume.data };
    (() => frameRef.contentWindow.postMessage(message, "*"))();
  }, [frameRef, resume.data]);

  // update current section for Simple Builder
  useEffect(() => {
    const section = getValidSectionValue(params.section);
    section && activeSection.left.setSection(section);
  }, [params]);

  // Send resume data to iframe on initial load
  useEffect(() => {
    if (!frameRef) return;
    frameRef.addEventListener("load", updateResumeInFrame);
    return () => frameRef.removeEventListener("load", updateResumeInFrame);
  }, [frameRef]);

  // Send resume data to iframe on change of resume data
  useEffect(updateResumeInFrame, [resume.data]);

  return (
    <>
      <Helmet>
        <title>
          {title} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <iframe
        ref={setFrameRef}
        title={resume.id}
        src="/artboard/builder"
        className={cn("w-screen", !isSimpleEditor && "mt-16")}
        style={{ height: `calc(100vh - 64px)`, width: "100%" }}
      />
    </>
  );
};

export const builderLoader: LoaderFunction<ResumeDto> = async ({ params }) => {
  try {
    const id = params.id as string;

    const resume = await queryClient.fetchQuery({
      queryKey: ["resume", { id }],
      queryFn: () => findResumeById({ id }),
    });

    useResumeStore.setState({ resume });
    useResumeStore.temporal.getState().clear();

    return resume;
  } catch (error) {
    return redirect("/dashboard");
  }
};
