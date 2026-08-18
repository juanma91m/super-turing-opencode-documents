-- Convert raw LaTeX page breaks to Typst, ODT, and DOCX.
-- Adapted from Quarto/rmarkdown's ISC-licensed pagebreak.lua.

local pagebreak = {
  ooxml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
  odt = '<text:p text:style-name="Pagebreak"/>',
  typst = '#pagebreak()'
}

local function is_pagebreak(command)
  return command:match '^\\newpage%{?%}?$'
    or command:match '^\\pagebreak%{?%}?$'
end

function RawBlock(el)
  if not el.format:match 'tex' or not is_pagebreak(el.text) then
    return nil
  end
  if FORMAT == 'docx' then
    return pandoc.RawBlock('openxml', pagebreak.ooxml)
  end
  if FORMAT == 'typst' then
    return pandoc.RawBlock('typst', pagebreak.typst)
  end
  if FORMAT:match 'odt' then
    return pandoc.RawBlock('opendocument', pagebreak.odt)
  end
  return nil
end
