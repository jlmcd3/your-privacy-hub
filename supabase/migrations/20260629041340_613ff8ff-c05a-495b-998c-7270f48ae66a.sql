CREATE POLICY "Admins update cycles"
ON public.tool_improvement_cycles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));